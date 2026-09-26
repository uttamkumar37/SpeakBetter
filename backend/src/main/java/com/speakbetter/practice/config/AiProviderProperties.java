package com.speakbetter.practice.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.ai")
public class AiProviderProperties {

	private boolean transcriptionEnabled = false;
	private String transcriptionProvider = "";
	private String transcriptionModel = "";
	private boolean analysisEnabled = false;
	private String analysisProvider = "";
	private String analysisModel = "";

	public boolean isTranscriptionEnabled() {
		return transcriptionEnabled;
	}

	public void setTranscriptionEnabled(boolean transcriptionEnabled) {
		this.transcriptionEnabled = transcriptionEnabled;
	}

	public String getTranscriptionProvider() {
		return transcriptionProvider;
	}

	public void setTranscriptionProvider(String transcriptionProvider) {
		this.transcriptionProvider = transcriptionProvider;
	}

	public String getTranscriptionModel() {
		return transcriptionModel;
	}

	public void setTranscriptionModel(String transcriptionModel) {
		this.transcriptionModel = transcriptionModel;
	}

	public boolean isAnalysisEnabled() {
		return analysisEnabled;
	}

	public void setAnalysisEnabled(boolean analysisEnabled) {
		this.analysisEnabled = analysisEnabled;
	}

	public String getAnalysisProvider() {
		return analysisProvider;
	}

	public void setAnalysisProvider(String analysisProvider) {
		this.analysisProvider = analysisProvider;
	}

	public String getAnalysisModel() {
		return analysisModel;
	}

	public void setAnalysisModel(String analysisModel) {
		this.analysisModel = analysisModel;
	}
}
