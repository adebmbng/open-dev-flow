---
name: workflow-debug-issue
description: Investigate an issue with the engineer using supplied context, service evidence and read-only logs.
---

# Debug an issue

Use the initiative description, supplied Jira issue and PRD when available, and any selected discovery or prior debugging artifacts. Identify the incident, environment, route, response, timestamp and request or trace identifiers from that context. If details are missing, make a targeted initial search where possible and ask the engineer for what is needed to narrow the investigation. Work interactively and preserve evidence; do not implement fixes or modify cloud resources as part of diagnosis.

Use any installed or supplied domain-specific investigation guidance when relevant. For Google Cloud Logging, use `gcloud logging read` with narrow time windows and filters. Determine the correct project and environment from the engineer or verified configuration; never guess project IDs or change the active project. Trace the gateway, application and downstream calls using correlation identifiers and source evidence. If no logs appear, check project, time window, labels, fields and ingestion delay before concluding traffic is absent.

If gcloud is missing, authentication has expired, or access is denied, report the precise blocker and continue with other available evidence. For expired credentials, ask the engineer to run `gcloud auth login` in their own terminal, complete sign-in, then retry. Never initiate interactive authentication on their behalf, print tokens, request credentials, or treat authentication errors as proof of a service failure.

Report the service returning the failure, the evidenced cause or clearly marked hypothesis, timestamp and correlation identifiers, decisive log and source references, remaining gaps and the next targeted check. Avoid unnecessary personal or secret data.
