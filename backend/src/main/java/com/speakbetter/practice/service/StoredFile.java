package com.speakbetter.practice.service;

/** Result of writing a recording to disk: where it landed and how big it is. */
public record StoredFile(String relativePath, long sizeBytes) {
}
