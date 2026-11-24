from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import json
from xml.etree.ElementTree import parse
class Page(HTMLParser):
 def __init__(self,text):
  super().__init__();self.refs=[];self.ids=set();self.canonical=[];self.feed(text)
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id' in a:self.ids.add(a['id'])
  if tag=='link' and a.get('rel')=='canonical':self.canonical.append(a.get('href'))
  if tag in ('a','link','script','img'):
   v=a.get('href') if tag in ('a','link') else a.get('src')
   if v:self.refs.append(v)
root=Path(__file__).resolve().parents[1]/'public';pages={p:Page(p.read_text(encoding='utf-8')) for p in root.glob('*.html')};errors=[]
for path,page in pages.items():
 if len(page.canonical)!=1:errors.append(str(path)+': canonical missing/duplicate')
 for href in page.refs:
  u=urlsplit(href)
  if u.scheme or u.netloc:continue
  target=(root/u.path.lstrip('/')) if u.path.startswith('/') else path.parent/u.path
  if not u.path:target=path
  if target.is_dir():target=target/'index.html'
  if not target.exists():errors.append(path.name+': missing '+href)
  elif u.fragment and target in pages and unquote(u.fragment) not in pages[target].ids:errors.append(path.name+': missing anchor '+href)
parse(root/'sitemap.xml')
if errors:raise SystemExit('\n'.join(errors))
print(f'{len(pages)} public pages: local links, anchors, assets, canonical tags and sitemap verified.')
