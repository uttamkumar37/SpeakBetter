package com.speakbetter.practice.service.storage;

import org.springframework.core.io.Resource;

/**
 * Where a recording's bytes actually come from when serving playback -
 * local disk (stream the bytes ourselves, with Range support) or a remote
 * object store (redirect the browser straight to a presigned URL).
 */
public sealed interface VideoSource {

	record LocalFile(Resource resource) implements VideoSource {
	}

	record RedirectUrl(String url) implements VideoSource {
	}
}
