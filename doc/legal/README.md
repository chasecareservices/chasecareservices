# Legal pages — review copies

Word copies of the four policies shown in the website footer, for review by Chase Care Services and its lawyer:

- `privacy-policy.docx`: Privacy Policy
- `terms-of-service.docx`: Website Terms of Use
- `acceptable-use-policy.docx`: Acceptable Use Policy
- `cookie-policy.docx`: Cookie Policy

The live wording is in `frontend/src/lib/legal/`, which is the version the website uses. After agreeing changes in these Word files, update those source files to match (and the "last updated" date and version), then regenerate these copies.

These documents were written for Chase Care Services under Ghana's Data Protection Act, 2012 (Act 843). They are not legal advice. A qualified Ghanaian lawyer should review them before the site launches.

Things to confirm before launch:

1. Chase Care's registered legal name, registration number and registered address. Contact details on the pages come from the site settings.
2. Registration with Ghana's Data Protection Commission as a data controller.
3. The retention periods in the Privacy Policy (section 9).
4. The partner organisations and service providers named in the Privacy Policy (sections 6 and 7), including where hosting providers store data.
5. That the Cookie Policy still matches the website whenever analytics or other tools are added.
