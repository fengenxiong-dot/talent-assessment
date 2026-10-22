# Security and Data-Handling Policy

Security and information protection are the highest-priority requirements for this project.

## Mandatory warning and confirmation

Before any design choice or action that may transmit, store, expose, copy, log, or process company data or personal information outside the user's directly controlled environment, Codex must stop and obtain the user's explicit confirmation.

The warning must state clearly:

- what data will be involved;
- the destination service, provider, country or region;
- whether the transfer is external, third-party, public, or cross-border;
- why the data is needed and how long it may be retained;
- the principal leakage, access-control, compliance, and vendor risks;
- safer alternatives, including local, on-premises, or mainland-China hosting where applicable.

This confirmation requirement includes, without limitation:

- cloud databases, object storage, analytics, logging, monitoring, AI services, SaaS tools, CDNs, and external APIs;
- employee, customer, HR, assessment, financial, operational, identity, contact, or authentication data;
- publishing an endpoint or application to the public internet;
- enabling logs that may contain personal information or credentials;
- uploading files or datasets to third-party services;
- selecting a cloud region outside mainland China;
- sharing data with plugins, connectors, MCP servers, or browser-based services;
- changing permissions, access scope, retention, backups, or deletion behavior.

Do not use real company or personal data for testing unless the user has explicitly approved the exact data scope and destination. Prefer synthetic or anonymized test data.

## Secrets

- Never place passwords, tokens, API keys, connection strings, private identifiers, or signing secrets in source files, handoff documents, chat responses, logs, screenshots, or version control.
- Use secret managers or protected environment variables.
- If a secret may have been exposed, warn the user immediately and recommend rotation before continuing.

## Secure defaults

- Prefer data minimization, least privilege, encryption, short retention, auditability, and private networking.
- Prefer infrastructure controlled by the user or company and located in mainland China for employee and company data, unless the user explicitly approves another region after reviewing the risks.
- Treat employee assessment and HR data as high-impact confidential information.
- Do not infer consent from a general request to build or deploy. External storage, cross-border transfer, public exposure, and production use require separate explicit confirmation.

## Security gate

Before production deployment or real-data import, perform and report a security review covering at least data flow, storage region, third parties, authentication, authorization, secrets, network exposure, logging, backups, retention, deletion, and incident response. Do not describe the system as production-ready until this review is complete and the user has accepted the remaining risks.
