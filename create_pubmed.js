const fs = require('fs');
const content = \export async function searchPubMed(query: string): Promise<{pmids: string[], context: string}> {
  try {
    const searchUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=' + encodeURIComponent(query + ' AND (Review[ptyp] OR Clinical Trial[ptyp])') + '&retmode=json&retmax=3&sort=relevance';
    
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    const ids = searchData.esearchresult?.idlist || [];
    
    if (ids.length === 0) return { pmids: [], context: 'Nenhum artigo encontrado no PubMed para esta busca.' };

    const fetchUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=' + ids.join(',') + '&retmode=xml';
    const fetchRes = await fetch(fetchUrl);
    const xml = await fetchRes.text();

    const articles = [];
    const pmids = [];
    const articleMatches = xml.match(/<PubmedArticle>[\\\\s\\\\S]*?<\\/PubmedArticle>/g) || [];
    
    for (const articleXml of articleMatches) {
      const pmidMatch = articleXml.match(/<PMID[^>]*>(\\\\d+)<\\/PMID>/);
      const titleMatch = articleXml.match(/<ArticleTitle[^>]*>([\\\\s\\\\S]*?)<\\/ArticleTitle>/);
      
      const abstractMatches = articleXml.match(/<AbstractText[^>]*>([\\\\s\\\\S]*?)<\\/AbstractText>/g);
      let abstract = '';
      if (abstractMatches) {
        abstract = abstractMatches.map(tag => tag.replace(/<[^>]+>/g, '')).join(' ');
      }

      if (pmidMatch && titleMatch) {
        pmids.push(pmidMatch[1]);
        articles.push(\PMID: \\\nTítulo: \\\nResumo: \\);
      }
    }

    if (articles.length === 0) return { pmids: [], context: 'Nenhum artigo processado adequadamente.' };

    return { pmids, context: articles.join('\\n\\n') };
  } catch (error) {
    console.error('PubMed API Error:', error);
    return { pmids: [], context: 'Erro ao recuperar dados do PubMed.' };
  }
}\;
fs.writeFileSync('src/lib/ai/pubmed.ts', content);
