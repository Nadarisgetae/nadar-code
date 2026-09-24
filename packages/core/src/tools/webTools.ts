import { search } from 'duck-duck-scrape';
import * as cheerio from 'cheerio';
import { ToolResult } from '../types.js';

export async function searchWeb(query: string): Promise<ToolResult> {
  try {
    const results = await search(query);
    if (!results.results || results.results.length === 0) {
      return { ok: true, output: "No results found." };
    }
    const formatted = results.results.slice(0, 7).map(r => 
      `Title: ${r.title}\nURL: ${r.url}\nDescription: ${r.description}`
    ).join('\n\n');
    return { ok: true, output: formatted };
  } catch (err: any) {
    return { ok: false, output: `Search failed: ${err.message}` };
  }
}

export async function fetchUrl(url: string): Promise<ToolResult> {
  try {
    const res = await fetch(url);
    if (!res.ok) return { ok: false, output: `HTTP Error: ${res.status} ${res.statusText}` };
    const html = await res.text();
    const $ = cheerio.load(html);
    $('script, style, nav, footer, header').remove();
    let text = $('body').text().replace(/\s+/g, ' ').trim();
    if (text.length > 8000) {
      text = text.slice(0, 8000) + '... (truncated)';
    }
    return { ok: true, output: text };
  } catch (err: any) {
    return { ok: false, output: `Fetch failed: ${err.message}` };
  }
}
