# ESN General Assembly Q&A

_Ex-candidates blog._

## Procedure to update (or create) email templates

_@todo to simplify with in-app templates editing._

The HTML source code of the templates is available in the back-end assets.
Each template has its own `code` with which to identify it on [SES](https://aws.amazon.com/ses/).

Example of a template's content (`sesTemplate-{code}.json`):

```
{
  "Template": {
    "TemplateName": "{code}",
    "SubjectPart": "<!-- get from first row of /back-end/assets/{code}-email.html -->",
    "HtmlPart": "<!-- get from /back-end/assets/{code}-email.html -->"
  }
}
```

AWS CLI command (considering the file placed in the Desktop folder):

```
aws ses --profile esn-ga update-template --cli-input-json "file://~/Desktop/sesTemplate-{code}.json"
```

For complex templates, you need a JSON-escaped version of the HTML code, to use in the SES template. In this case, you can use [any online tool](https://www.freeformatter.com/json-escape.html).
