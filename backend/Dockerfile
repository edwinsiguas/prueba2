# Etapa 1: Compilación de la aplicación Spring Boot con Maven y Java 21
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app

# Copiar descriptor de dependencias
COPY pom.xml .

# Descargar dependencias en caché
RUN mvn dependency:go-offline -B

# Copiar código fuente y compilar JAR de producción
COPY src ./src
RUN mvn clean package -DskipTests

# Etapa 2: Imagen ligera de ejecución en producción
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Crear usuario sin privilegios por seguridad
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Copiar el artefacto generado
COPY --from=build /app/target/*.jar app.jar

# Variables de entorno por defecto
ENV PORT=8080
EXPOSE 8080

# Comando de inicio optimizado para contenedores
ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
