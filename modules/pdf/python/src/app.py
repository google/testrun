"""HTML to PDF."""

import os
import re
from bottle import Bottle, request, response, BaseRequest
from weasyprint import HTML
from weasyprint.text.fonts import FontConfiguration
from common import logger

# Increase the maximum request size to 50MB
BaseRequest.MEMFILE_MAX = 50 * 1024 * 1024

LOGGER = logger.get_logger('pdf_module')

FONTS_PATH=os.environ.get('FONTS_PATH')

fonts_dict = {}

# Getting all local fonts
for font_file in next(os.walk(FONTS_PATH), (None, None, []))[2]:
  fonts_dict[os.path.splitext(
                              os.path.basename(font_file)
                              )[0]] = str(os.path.join(FONTS_PATH, font_file))


def replace_fontface_urls_in_css(css: str, fonts: dict) -> str:
  """
  Function to replace font-family URLs 
  in the @font-face rules with paths from the fonts dictionary.
  """

  # Search for all font-face rules in the CSS
  fontface_regex = re.compile(r'@font-face\s*{[^}]+}', re.IGNORECASE)
  fontface_rules = fontface_regex.findall(css)

  for rule in fontface_rules:
    # Find the font-family declaration in the rule
    font_family_match = re.search(r"font-family:\s*'([^']+)';", rule)
    if font_family_match:
      font_family = font_family_match.group(1)
      # If the font family is in the dictionary, replace its URL
      if font_family in fonts:
        # Replace the original URL with the custom path in the rule
        custom_path = fonts[font_family]
        # Replace the url() declaration inside the @font-face rule
        rule_local = re.sub(
                            r"url\(([^']+)\)",
                            f"url('file://{custom_path}')",
                            rule
                            )
        # Replace the original rule in the CSS with the modified one
        css = css.replace(rule, rule_local)

  return css


def replace_fontface_urls_in_html(html_content: str, fonts: dict) -> str:
  """Function to find and replace font-family URLs in the HTML"""

  style_tag_regex = re.compile( r'<style[^>]*>(.*?)</style>',
                                re.IGNORECASE | re.DOTALL
                                )

  style_blocks = style_tag_regex.findall(html_content)
  for style_block in style_blocks:
    # Replace font URLs in the CSS within the <style> block
    modified_css = replace_fontface_urls_in_css(style_block, fonts)
    # Replace the original <style> block with the modified one
    html_content = html_content.replace(style_block, modified_css)
  return html_content

app = Bottle()

# Server health check
@app.get('/health')
def health():
  return {'alive': True}

# generate PDF from html
@app.post('/pdf/<filename>')
def generate_pdf(filename):
  font_config = FontConfiguration()
  html_content = request.forms.getunicode('html')

  if not html_content:
    response.status = 400
    return 'No HTML content provided'
  try:
    pdf = HTML(
      string=replace_fontface_urls_in_html(html_content, fonts_dict)
      ).write_pdf(font_config=font_config)
    LOGGER.debug('PDF was succesfully generated.')
  except Exception as e:
    response.status = 500
    LOGGER.error(e)
    return f'Error generating PDF: {e}'

  # Return the PDF as a response
  response.content_type = 'application/pdf'
  response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
  return pdf

if __name__ == '__main__':
  app.run()
