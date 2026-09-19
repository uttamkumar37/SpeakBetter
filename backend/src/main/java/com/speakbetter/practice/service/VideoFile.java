package com.speakbetter.practice.service;

import org.springframework.core.io.Resource;

/** A recording's bytes plus the MIME type it was originally uploaded as. */
public record VideoFile(Resource resource, String mimeType) {
}
