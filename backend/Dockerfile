# Build stage - compiles and packages the Spring Boot app. Uses the official
# Gradle image (Gradle pre-installed) rather than bootstrapping via ./gradlew -
# the wrapper's own minimal downloader hangs on connect() inside Docker
# Desktop's networking, even though normal Gradle dependency resolution and
# plain curl both work fine from the same container.
FROM gradle:8.10.2-jdk21-jammy AS build
WORKDIR /app

COPY build.gradle settings.gradle ./
COPY src src
RUN gradle build -x test --no-daemon

# Runtime stage - just the JRE and the built jar, nothing else.
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
