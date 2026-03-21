.PHONY: run run-container gcloud-deploy

run:
	@streamlit run Homepage.py --server.port=8080 --server.address=0.0.0.0

run-container:
	@docker build . -t j70_tuning_guide
	@docker run -p 8080:8080 j70_tuning_guide

gcloud-deploy:
	@gcloud app deploy app.yaml