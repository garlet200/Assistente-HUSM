export interface PubMedArticleReference {
  id: string;
  title: string;
}

export interface PubMedSearchResult {
  pmids: PubMedArticleReference[];
  context: string;
}

const PUBMED_SEARCH_BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
const PUBMED_FETCH_BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';
const MAXIMUM_ARTICLES_TO_RETRIEVE = 3;

/**
 * Searches the NCBI PubMed database for relevant clinical review articles and trials.
 * Returns an array of article IDs matching the query.
 */
async function fetchPubMedArticleIdentifiers(clinicalQuery: string): Promise<string[]> {
  const filteredSearchTerm = `${clinicalQuery} AND (Review[ptyp] OR Clinical Trial[ptyp])`;
  const searchUrl = `${PUBMED_SEARCH_BASE_URL}?db=pubmed&term=${encodeURIComponent(
    filteredSearchTerm
  )}&retmode=json&retmax=${MAXIMUM_ARTICLES_TO_RETRIEVE}&sort=relevance`;

  const searchHttpResponse = await fetch(searchUrl);
  if (!searchHttpResponse.ok) {
    throw new Error(`Falha na busca do PubMed: HTTP status ${searchHttpResponse.status}`);
  }

  const searchResultsJson = await searchHttpResponse.json();
  const articleIdentifiers: string[] = searchResultsJson.esearchresult?.idlist || [];

  return articleIdentifiers;
}

/**
 * Fetches full XML metadata for a given list of PubMed IDs.
 */
async function fetchPubMedArticlesXmlPayload(articleIdentifiers: string[]): Promise<string> {
  const commaSeparatedIdentifiers = articleIdentifiers.join(',');
  const fetchUrl = `${PUBMED_FETCH_BASE_URL}?db=pubmed&id=${commaSeparatedIdentifiers}&retmode=xml`;

  const fetchHttpResponse = await fetch(fetchUrl);
  if (!fetchHttpResponse.ok) {
    throw new Error(`Falha ao obter artigos do PubMed: HTTP status ${fetchHttpResponse.status}`);
  }

  return await fetchHttpResponse.text();
}

/**
 * Extracts titles, abstracts, and identifiers from the raw XML payload returned by E-utilities.
 */
function extractArticlesFromXmlPayload(rawXmlPayload: string): {
  articleReferences: PubMedArticleReference[];
  formattedSummaries: string[];
} {
  const articleBlockMatches = rawXmlPayload.match(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g) || [];
  const articleReferences: PubMedArticleReference[] = [];
  const formattedSummaries: string[] = [];

  for (const articleXmlBlock of articleBlockMatches) {
    const pmidRegexMatch = articleXmlBlock.match(/<PMID[^>]*>(\d+)<\/PMID>/);
    const titleRegexMatch = articleXmlBlock.match(/<ArticleTitle[^>]*>([\s\S]*?)<\/ArticleTitle>/);

    if (!pmidRegexMatch || !titleRegexMatch) {
      continue;
    }

    const pubmedIdentifier = pmidRegexMatch[1];
    const articleTitle = titleRegexMatch[1].replace(/<[^>]+>/g, '').trim();

    const abstractMatches = articleXmlBlock.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g);
    let abstractContent = 'Sem resumo disponível.';

    if (abstractMatches && abstractMatches.length > 0) {
      abstractContent = abstractMatches
        .map((tag) => tag.replace(/<[^>]+>/g, '').trim())
        .join(' ');
    }

    articleReferences.push({
      id: pubmedIdentifier,
      title: articleTitle,
    });

    formattedSummaries.push(
      `PMID: ${pubmedIdentifier}\nTítulo: ${articleTitle}\nResumo: ${abstractContent}`
    );
  }

  return { articleReferences, formattedSummaries };
}

/**
 * Primary interface for PubMed Evidence Retrieval (RAG).
 * Queries NCBI E-Utilities and returns structured evidence context for the AI reasoning layer.
 */
export async function searchPubMed(clinicalQuery: string): Promise<PubMedSearchResult> {
  try {
    const articleIdentifiers = await fetchPubMedArticleIdentifiers(clinicalQuery);

    if (articleIdentifiers.length === 0) {
      return {
        pmids: [],
        context: 'Nenhum artigo encontrado no PubMed para esta busca.',
      };
    }

    const rawXmlPayload = await fetchPubMedArticlesXmlPayload(articleIdentifiers);
    const { articleReferences, formattedSummaries } = extractArticlesFromXmlPayload(rawXmlPayload);

    if (formattedSummaries.length === 0) {
      return {
        pmids: [],
        context: 'Nenhum artigo processado adequadamente.',
      };
    }

    return {
      pmids: articleReferences,
      context: formattedSummaries.join('\n\n'),
    };
  } catch (error) {
    console.error('PubMed API Error:', error);
    return {
      pmids: [],
      context: 'Erro ao recuperar dados do PubMed.',
    };
  }
}