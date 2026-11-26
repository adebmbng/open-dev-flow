---
name: workflow-debug-issue
description: Investigate an issue with the engineer using supplied initiative context, service evidence and read-only Bravo Cloud Logging.
---

# Debug an issue

Use the initiative description, supplied Jira issue and PRD when available, and any selected discovery or prior debugging artifacts. Identify the incident, environment, route, response, timestamp and request or trace identifiers from that context. If details are missing, make a targeted initial search where possible and ask the engineer for what is needed to narrow the investigation. Work interactively and preserve evidence; do not implement fixes or modify cloud resources as part of diagnosis.

Use the BFI Bravo Cloud Logging investigation method. For production use project `bravo-project-331802`; for nonproduction use `bravo-project-nonprod`. Respect an explicitly specified project and verify the environment. Pass `--project` on gcloud commands instead of changing the active configuration. Workloads commonly use `<env>-ms-<service-name>`, but verify actual resource labels and relevant deployment configuration.

Use `gcloud logging read` with narrow time windows and filters. Begin at the reported route and gateway response, then trace the actual application container, correlation identifiers, and downstream calls. Check structured and text log fields, timestamps, pod and namespace; correlate different IDs only when evidence supports it. Follow the first meaningful exception or failed dependency response, compare successful traffic when useful, and check the source and deployed version when available. If no logs appear, check project, time window, labels, fields and ingestion delay before concluding traffic is absent.

If gcloud is missing, authentication has expired, or access is denied, report the precise blocker and continue with other available evidence. For expired credentials, ask the engineer to run `gcloud auth login` in their own terminal, complete any browser authentication themselves, then retry the read-only query. Never initiate interactive authentication on their behalf, print tokens, request credentials, change the active project, or treat authentication errors as proof of a service failure.

Report the service returning the failure, the evidenced cause or clearly marked hypothesis, timestamp and correlation identifiers, decisive log and source references, remaining gaps and the next targeted check. Distinguish gateway, application and downstream ownership. Avoid unnecessary personal or secret data.
