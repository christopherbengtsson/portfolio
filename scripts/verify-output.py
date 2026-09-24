from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
import json
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1] / 'dist'
ORIGIN = 'https://christopherbengtsson.dev'


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags = []
        self.title = ''
        self.in_title = False
        self.in_json = False
        self.json_text = ''
        self.schemas = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        self.tags.append((tag, attributes))
        if tag == 'title':
            self.in_title = True
        if tag == 'script' and attributes.get('type') == 'application/ld+json':
            self.in_json = True
            self.json_text = ''

    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False
        if tag == 'script' and self.in_json:
            self.schemas.append(json.loads(self.json_text))
            self.in_json = False

    def handle_data(self, data):
        if self.in_title:
            self.title += data
        if self.in_json:
            self.json_text += data

    def tag(self, name):
        return [attrs for tag, attrs in self.tags if tag == name]


def route_file(path):
    return ROOT / path.lstrip('/') / 'index.html'


pages = {}
referenced_js = set()
for file in ROOT.rglob('*.html'):
    if file.name == '404.html':
        continue
    route = '/' + str(file.relative_to(ROOT).parent).replace('\\', '/')
    route = '/' if route == '/.' else route.rstrip('/') + '/'
    source = file.read_text()
    module_scripts = list(re.finditer(r'<script\b(?=[^>]*\btype="module")[^>]*>(.*?)</script>', source, re.S))
    assert module_scripts, f'{route}: missing client scripts'
    assert all(source.index('<body') < script.start() < source.index('</body>') for script in module_scripts), f'{route}: module script outside the body'
    confirmation = [script for script in module_scripts if 'contact-success' in script.group(1) and '.focus()' in script.group(1)]
    if route in ('/', '/sv/'):
        assert confirmation, f'{route}: missing confirmation focus script'
    theme = [script for script in module_scripts if re.search(r'\bsrc="/_astro/[^"]+\.js"', script.group(0))]
    assert theme, f'{route}: missing bundled theme controller'
    for script in theme:
        path = re.search(r'\bsrc="([^"]+)"', script.group(0)).group(1)
        referenced_js.add(ROOT / path.lstrip('/'))
    assert '<script>' in source[:source.index('<body')] and "localStorage.getItem('theme')" in source[:source.index('<body')], f'{route}: missing early theme initialization'
    assert source.rstrip().endswith('</html>'), f'{route}: content after the document'
    parsed = Page()
    parsed.feed(source)
    pages[route] = parsed

assert set(pages) == {'/', '/sv/', '/privacy/', '/sv/privacy/'}, f'Unexpected generated pages: {sorted(pages)}'
assert pages['/'].tag('html')[0]['lang'] == 'en'
assert pages['/sv/'].tag('html')[0]['lang'] == 'sv'

css_files = list(ROOT.rglob('*.css'))
assert len(css_files) == 1, f'Expected one CSS bundle, found {len(css_files)}'
assert referenced_js and all(path.exists() for path in referenced_js), 'Theme controller bundle missing'
assert set(ROOT.rglob('*.js')) == referenced_js, 'Unexpected or unreferenced JavaScript'

for route, page in pages.items():
    locale = page.tag('html')[0]['lang']
    is_privacy = route in ('/privacy/', '/sv/privacy/')
    assert locale == ('sv' if route.startswith('/sv/') else 'en')
    robots = [a.get('content') for a in page.tag('meta') if a.get('name') == 'robots']
    assert robots == (['noindex, follow'] if is_privacy else [])
    assert len(page.tag('h1')) == 1, f'{route}: expected one h1'
    assert len(page.tag('main')) == 1 and page.tag('main')[0].get('id') == 'main'
    assert len(page.tag('nav')) == 2
    assert any(a.get('href') == '#main' for a in page.tag('a'))
    assert page.title
    descriptions = [a['content'] for a in page.tag('meta') if a.get('name') == 'description']
    assert len(descriptions) == 1 and descriptions[0]
    canonical = [a['href'] for a in page.tag('link') if a.get('rel') == 'canonical']
    assert canonical == [ORIGIN + route]
    alternates = {a.get('hreflang'): a.get('href') for a in page.tag('link') if a.get('rel') == 'alternate'}
    suffix = 'privacy/' if is_privacy else ''
    assert alternates == {'en': ORIGIN + '/' + suffix, 'sv': ORIGIN + '/sv/' + suffix}
    og = {a.get('property'): a.get('content') for a in page.tag('meta') if a.get('property', '').startswith('og:')}
    assert set(og) >= {'og:title', 'og:type', 'og:description', 'og:url', 'og:image', 'og:image:alt'}
    assert og['og:url'] == canonical[0] and og['og:image'] == f'{ORIGIN}/og-{locale}.png'
    assert og['og:image:alt'] and (ROOT / f'og-{locale}.png').exists()
    assert og['og:image:width'] == '1200' and og['og:image:height'] == '630'
    assert {schema['@type'] for schema in page.schemas} == {'Person', 'WebSite'}
    scripts = page.tag('script')
    if not is_privacy:
        assert any(script.get('type') == 'module' and 'src' not in script for script in scripts)
    assert any(script.get('type') == 'module' and script.get('src', '').endswith('.js') for script in scripts)
    assert all(script.get('type') in (None, 'module', 'application/ld+json') for script in scripts)
    assert not page.tag('style')
    stylesheets = [a['href'] for a in page.tag('link') if a.get('rel') == 'stylesheet']
    assert len(stylesheets) == 1 and (ROOT / stylesheets[0].lstrip('/')).exists()
    ids = {attributes.get('id') for _, attributes in page.tags}
    if not is_privacy:
        assert {'main', 'top', 'services', 'experience', 'contact', 'contact-success'} <= ids
        assert 'privacy' not in ids
        assert any(a.get('id') == 'contact-success' and a.get('role') == 'status' for a in page.tag('p'))
    privacy_route = '/sv/privacy/' if locale == 'sv' else '/privacy/'
    assert len([a for a in page.tag('a') if a.get('href') == privacy_route]) >= 2
    for link in page.tag('a'):
        href = link.get('href', '')
        if href.startswith('#'):
            assert href[1:] in ids, f'{route}: broken section link {href}'
        elif href.startswith('/') and not href.startswith('//'):
            target = urlparse(href).path
            assert route_file(target).exists() or (ROOT / target.lstrip('/')).exists(), f'{route}: broken link {href}'
            fragment = urlparse(href).fragment
            if fragment:
                target_ids = {attrs.get('id') for _, attrs in pages[target].tags}
                assert fragment in target_ids, f'{route}: broken section link {href}'
    forms = page.tag('form')
    if is_privacy:
        assert not forms
        assert 'privacy-title' in ids
        continue
    assert len(forms) == 1 and forms[0].get('action') == f'/api/contact?locale={locale}'
    assert forms[0].get('method') == 'post'
    assert len([a for a in page.tag('input') if a.get('type') == 'radio']) == 0
    assert page.tag('label')
    assert len([a for a in page.tag('textarea') if a.get('name') == 'message']) == 1
    assert any(a.get('name') == 'company_site' for a in page.tag('input'))

assert len({page.title for page in pages.values()}) == 4
ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
sitemap = ET.parse(ROOT / 'sitemap.xml').getroot()
locs = {node.text for node in sitemap.findall('s:url/s:loc', ns)}
assert locs == {ORIGIN + '/', ORIGIN + '/sv/'}, f'Unexpected sitemap URLs: {locs}'
assert not list(ROOT.rglob('rss.xml')), 'Retired RSS feed remains'
assert json.loads((ROOT / '_routes.json').read_text())['include'] == ['/api/contact']
headers = (ROOT / '_headers').read_text()
assert re.search(r'/_astro/\*\s+! Cache-Control\s+Cache-Control: public, max-age=31536000, immutable', headers)
assert 'OAI-SearchBot' in (ROOT / 'robots.txt').read_text()
llms = (ROOT / 'llms.txt').read_text()
assert f'{ORIGIN}/' in llms and f'{ORIGIN}/sv/' in llms
assert not any(old in llms for old in ('/services/', '/stories/', '/about/', '/contact/', '/sv/tjanster/', '/sv/berattelser/', '/sv/om/', '/sv/kontakt/'))
assert (ROOT / '404.html').exists()

print('Validated two landing pages and two noindex privacy pages, section links, forms, sitemap, and metadata.')
