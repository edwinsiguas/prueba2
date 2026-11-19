# Etapa 1: Compilación de la aplicación Spring Boot con Maven y Java 21
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app

# Copiar descriptor de dependencias
COPY pom.xml .

# Descargar dependencias en caché (en modo batch sin barras de progreso ruidosas)
RUN mvn dependency:go-offline -B --no-transfer-progress

# Copiar código fuente y compilar JAR de producción
COPY src ./src
RUN mvn clean package -DskipTests -B --no-transfer-progress

# Etapa 2: Imagen ligera de ejecución en producción
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Crear directorios necesarios (logs y uploads) con permisos para el usuario spring
RUN addgroup -S spring && adduser -S spring -G spring && \
    mkdir -p /app/logs /app/uploads && \
    chown -R spring:spring /app

# Copiar el artefacto generado con propietario spring
COPY --from=build --chown=spring:spring /app/target/*.jar app.jar

# Cambiar a usuario no privilegiado
USER spring:spring

# Variables de entorno por defecto
ENV PORT=8080
EXPOSE 8080

# Comando de inicio optimizado para contenedores de 512 MB (Render Free Tier)
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
