### Quality Assurance Notes – CV Upload & ATS Scoring Feature

#### Front-End QA & User Experience Review

While testing the CV upload and ATS scoring workflow, several potential improvements were identified to enhance the user experience and provide more actionable feedback to candidates.

##### Current State

* Users upload their CV and receive an ATS score.
* The score provides a general indication of ATS compatibility.

##### Proposed Enhancements

* Introduce a **Recruiter Feedback Score (0–10)** alongside the ATS score.
* Present scoring in a more recruiter-centric format to help users better understand how a hiring manager may perceive their application.
* Include visual indicators such as:

  * ATS Score (%)
  * Recruiter Feedback Score (/10)
  * Technical Skills Match
  * Experience Relevance
  * Formatting & Readability
  * Keyword Alignment
* Add colour-coded feedback categories:

  * 8–10 = Strong Application
  * 5–7 = Competitive but requires improvement
  * 0–4 = Significant optimisation required
* Improve loading states during CV analysis by:

  * Displaying progress indicators
  * Showing analysis stages (Parsing CV → Knowledge Base Matching → ATS Evaluation → Recruiter Feedback Generation)
  * Providing estimated completion times

##### QA Testing Considerations

* Validate uploads across multiple file formats (.pdf, .docx).
* Test CVs of varying lengths and structures.
* Verify score consistency across repeated uploads.
* Ensure mobile and desktop responsiveness.
* Test user experience under slower network conditions.

---

#### Back-End QA & Data Quality Review

##### Knowledge Base & RAG Validation

The effectiveness of ATS scoring and recruiter feedback depends heavily on the quality and freshness of the Retrieval-Augmented Generation (RAG) system.

##### Key Validation Areas

* Ensure the knowledge base contains up-to-date technical job market data.
* Regularly refresh:

  * Software Engineering roles
  * Data Engineering roles
  * Machine Learning and AI positions
  * Cloud Engineering opportunities
  * Cybersecurity positions
  * Product and Technical Analyst roles
* Validate that retrieved job descriptions accurately match user-selected career paths.
* Monitor retrieval accuracy and relevance scores.
* Detect and remove duplicate job listings.
* Verify data integrity during ingestion and indexing processes.

##### CI/CD Pipeline Requirements

To maintain data quality and platform reliability:

* Automate knowledge base updates through CI/CD workflows.
* Schedule regular ingestion of new job descriptions and industry requirements.
* Implement automated testing before deployment.
* Validate embeddings and vector database updates after each refresh.
* Monitor API performance and retrieval latency.
* Establish rollback procedures for failed deployments.
* Track changes to job market trends and keyword requirements over time.

##### QA Success Metrics

* CV upload success rate > 99%.
* ATS scoring response time < 10 seconds.
* Knowledge base refresh success rate > 95%.
* Retrieval relevance score maintained above target threshold.
* Zero critical deployment failures in production.
* Consistent ATS and recruiter feedback outputs across repeated test cases.

---

#### Future Enhancement Opportunities

* Recruiter persona selection (Startup Recruiter, FAANG Recruiter, Consulting Recruiter, Healthcare Recruiter).
* Industry-specific ATS scoring models.
* Cover Letter Engine integration.
* Real-time labour market intelligence.
* Benchmarking against successful CVs from similar roles.
* Personalised career progression recommendations powered by the AI Matrix.
