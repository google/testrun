"""HTML to PDF."""

from bottle import Bottle, request, response
from weasyprint import HTML

app = Bottle()

# Server health check
@app.get('/health')
def health():
  return {'alive': True}

# generate PDF from html
@app.post('/pdf/<filename>')
def generate_pdf(filename):
  html_content = request.forms.getunicode('html')

  if not html_content:
    response.status = 400
    return 'No HTML content provided'
  try:
    pdf = HTML(string=html_content).write_pdf()
  except Exception as e:
    response.status = 500
    return f'Error generating PDF: {e}'

  # Return the PDF as a response
  response.content_type = 'application/pdf'
  response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
  return pdf

if __name__ == '__main__':
  app.run()
