from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

def modify_html(html_content, base_url, profile, proxy_url_prefix, session_id):
    """
    Modifies HTML to apply accessibility profiles, inject tracker, and fix links.
    """
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # 1. Rewrite links and assets to make them absolute
    tags_to_update = {
        'a': 'href',
        'link': 'href',
        'img': 'src',
        'script': 'src',
        'form': 'action',
        'iframe': 'src'
    }
    
    for tag, attr in tags_to_update.items():
        for element in soup.find_all(tag):
            url = element.get(attr)
            if url:
                # Make it absolute based on the target website's base URL
                absolute_url = urljoin(base_url, url)
                
                # If it's an anchor tag, route it back through our proxy so they stay in the enabler
                if tag == 'a':
                    element[attr] = f"{proxy_url_prefix}?url={absolute_url}&session_id={session_id}"
                else:
                    element[attr] = absolute_url

    # 2. Inject Accessibility CSS
    if profile != 'default':
        style_tag = soup.new_tag('style')
        if profile == 'large_text':
            style_tag.string = """
                * {
                    font-size: 130% !important;
                    line-height: 1.6 !important;
                }
            """
        elif profile == 'high_contrast':
            style_tag.string = """
                * {
                    background-color: #121212 !important;
                    color: #ffffff !important;
                    border-color: #ffffff !important;
                }
                a { color: #5fb1f7 !important; text-decoration: underline !important; }
            """
        elif profile == 'simplified':
            style_tag.string = """
                * {
                    font-family: Arial, sans-serif !important;
                }
                header, footer, nav, aside, iframe, .sidebar, .ad, .advertisement {
                    display: none !important;
                }
                body {
                    max-width: 800px !important;
                    margin: 0 auto !important;
                    padding: 20px !important;
                }
            """
        soup.head.append(style_tag)

    # 3. Inject Behavior Tracker & Widget Script
    tracker_script = soup.new_tag('script')
    # Use relative path for our own server's static file
    tracker_script['src'] = "/static/js/tracker.js"
    soup.head.append(tracker_script)

    widget_css = soup.new_tag('link', rel='stylesheet', href='/static/css/widget.css')
    soup.head.append(widget_css)

    widget_js = soup.new_tag('script', src='/static/js/widget.js')
    soup.body.append(widget_js)

    google_translate = soup.new_tag('script', src='https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit')
    soup.body.append(google_translate)
    
    # Inject session and target info into window object for the tracker to use
    config_script = soup.new_tag('script')
    config_script.string = f"""
        window.ACCESSIBILITY_ENABLER_CONFIG = {{
            sessionId: "{session_id}",
            targetUrl: "{base_url}"
        }};
    """
    soup.head.append(config_script)

    # 4. Inject SVG Filters for Color Blindness
    svg_filters = BeautifulSoup("""
    <svg xmlns="http://www.w3.org/2000/svg" style="display:none;">
        <defs>
            <filter id="protanopia-filter">
                <feColorMatrix type="matrix" values="0.567, 0.433, 0, 0, 0  0.558, 0.442, 0, 0, 0  0, 0.242, 0.758, 0, 0  0, 0, 0, 1, 0" />
            </filter>
            <filter id="deuteranopia-filter">
                <feColorMatrix type="matrix" values="0.625, 0.375, 0, 0, 0  0.7, 0.3, 0, 0, 0  0, 0.3, 0.7, 0, 0  0, 0, 0, 1, 0" />
            </filter>
            <filter id="tritanopia-filter">
                <feColorMatrix type="matrix" values="0.95, 0.05, 0, 0, 0  0, 0.433, 0.567, 0, 0  0, 0.475, 0.525, 0, 0  0, 0, 0, 1, 0" />
            </filter>
        </defs>
    </svg>
    """, 'html.parser')
    soup.body.append(svg_filters)

    return str(soup)
