# Build stage - compiles and packages the Spring Boot app.
FROM eclipse-temurin:21-jdk-jammy AS build
WORKDIR /app

# Copy just the build files first so dependency resolution is cached across
# rebuilds when only application source changes.
COPY gradlew build.gradle settings.gradle ./
COPY gradle gradle
RUN chmod +x gradlew

COPY src src
RUN ./gradlew build -x test --no-daemon

# Runtime stage - just the JRE and the built jar, nothing else.
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
