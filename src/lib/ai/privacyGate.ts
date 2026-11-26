/**
 * @file privacyGate.ts
 * @description Barreira de privacidade e anonimização (LGPD) que censura dados sensíveis
 * de pacientes (CPF, e-mail, telefone, prontuário, CNS, RG e nomes em contexto clínico)
 * localmente no navegador e em defesa em profundidade no servidor.
 */

export interface DeIdentifyResult {
  sanitizedText: string;
  hadRedactions: boolean;
}

const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

const BRAZILIAN_CNS_PATTERN =
  /(?:\bCNS\s*[:#-]?\s*)?(?:\b\d{15}\b|\b\d{3}[\s.-]\d{4}[\s.-]\d{4}[\s.-]\d{4}\b)/gi;

const BRAZILIAN_RG_PATTERN = /\bRG\s*[:#-]?\s*\d[\d.\-\s]{4,14}[0-9Xx]?\b/gi;

const LABELED_RECORD_NUMBER_PATTERN =
  /\b(?:prontu[aá]rio|registro(?:\s+hospitalar)?)\s*(?:n[º°.]?\s*)?[:#-]?\s*\d{4,10}(?:[-/]\d{1,3})?\b/gi;

const STANDALONE_RECORD_NUMBER_PATTERN = /\b\d{5,7}\/\d{1,2}\b/g;

const BRAZILIAN_CPF_PATTERN =
  /(?:\bCPF\s*[:#-]?\s*)?(?:\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b\d{9}-\d{2}\b|\b\d{11}\b)/gi;

const BRAZILIAN_PHONE_PATTERN =
  /(?:\+55[\s.-]?)?(?:\(\d{2}\)|\b[1-9]\d)[\s.-]?9?\d{4}[\s.-]\d{4}\b|\b9\d{4}[\s.-]\d{4}\b|\b(?!(?:19|20)\d{2}-(?:19|20)\d{2}\b)[2-5]\d{3}-\d{4}\b/g;

const PATIENT_NAME_MARKER_PATTERN =
  /\b(?:nome\s+do\s+paciente\s*[:=-]?|nome\s*[:=-]|paciente(?:\s+chamad[oa]|\s+identificad[oa]\s+como)?\s*[:=-]?|sra?\.|dona|seu|chamad[oa](?:\s+de)?|identificad[oa]\s+como)\s+/gi;

const CAPITALIZED_NAME_WORD_PATTERN = /^[A-ZÀ-Ý][a-zà-ÿ'-]+$/;
const NAME_CONNECTOR_WORDS = new Set(['da', 'de', 'do', 'dos', 'das', 'e']);
const NON_NAME_CLINICAL_WORDS = new Set([
  'Masculino',
  'Feminino',
  'Gestante',
  'Idoso',
  'Idosa',
  'Pediátrico',
  'Pediátrica',
  'Neonatal',
  'Internado',
  'Internada',
  'Diabético',
  'Diabética',
  'Hipertenso',
  'Hipertensa',
  'Assintomático',
  'Assintomática',
  'Sintomático',
  'Sintomática',
  'Estável',
  'Instável',
  'Crítico',
  'Crítica',
  'Grave',
  'Agudo',
  'Aguda',
  'Crônico',
  'Crônica',
  'Doença',
  'Síndrome',
  'Escore',
  'Sinal',
  'Critério',
  'Critérios',
  'Protocolo',
  'Nome',
  'Paciente',
  'Dona',
  'Seu',
]);

const MAX_NAME_WORDS = 4;

function isEligibleNameWord(word: string): boolean {
  return CAPITALIZED_NAME_WORD_PATTERN.test(word) && !NON_NAME_CLINICAL_WORDS.has(word);
}

function consumeLeadingPatientName(trailingText: string): { matchedLength: number } {
  const tokenMatches = Array.from(trailingText.matchAll(/\S+/g));
  let capitalizedCount = 0;
  let lastValidEndIndex = 0;

  for (let i = 0; i < tokenMatches.length && capitalizedCount < MAX_NAME_WORDS; i += 1) {
    const token = tokenMatches[i][0];
    const tokenEnd = (tokenMatches[i].index ?? 0) + token.length;

    if (isEligibleNameWord(token)) {
      capitalizedCount += 1;
      lastValidEndIndex = tokenEnd;
      continue;
    }

    const nextToken = tokenMatches[i + 1]?.[0];
    const isConnectorBeforeName =
      capitalizedCount > 0 &&
      NAME_CONNECTOR_WORDS.has(token.toLowerCase()) &&
      Boolean(nextToken && isEligibleNameWord(nextToken));

    if (!isConnectorBeforeName) break;
  }

  return { matchedLength: lastValidEndIndex };
}

function redactContextualPatientNames(inputText: string): string {
  const matcher = new RegExp(PATIENT_NAME_MARKER_PATTERN.source, 'gi');
  let result = '';
  let cursor = 0;
  let match = matcher.exec(inputText);

  while (match !== null) {
    const markerEnd = match.index + match[0].length;
    const trailingSegment = inputText.slice(markerEnd).split(/[\n,.;:()[\]]/, 1)[0] ?? '';
    const { matchedLength } = consumeLeadingPatientName(trailingSegment);

    if (matchedLength > 0) {
      result += `${inputText.slice(cursor, markerEnd)}[NOME CENSURADO]`;
      cursor = markerEnd + matchedLength;
      matcher.lastIndex = cursor;
    }

    match = matcher.exec(inputText);
  }

  return result + inputText.slice(cursor);
}

/**
 * Replaces sensitive patient identifiers (CPF, email, phone, medical record, CNS, RG,
 * and contextual patient names) with redacted placeholders while preserving clinical terms.
 */
export function deIdentify(rawInputText: string): string {
  if (!rawInputText) return rawInputText;

  const redactedIdentifiers = rawInputText
    .replace(EMAIL_PATTERN, '[EMAIL CENSURADO]')
    .replace(BRAZILIAN_CNS_PATTERN, '[DOCUMENTO CENSURADO]')
    .replace(BRAZILIAN_RG_PATTERN, '[DOCUMENTO CENSURADO]')
    .replace(LABELED_RECORD_NUMBER_PATTERN, '[PRONTUÁRIO CENSURADO]')
    .replace(STANDALONE_RECORD_NUMBER_PATTERN, '[PRONTUÁRIO CENSURADO]')
    .replace(BRAZILIAN_CPF_PATTERN, '[CPF CENSURADO]')
    .replace(BRAZILIAN_PHONE_PATTERN, '[TELEFONE CENSURADO]');

  return redactContextualPatientNames(redactedIdentifiers);
}

/**
 * Sanitizes text locally and reports whether any sensitive patient data was redacted.
 */
export function deIdentifyWithReport(rawInputText: string): DeIdentifyResult {
  const sanitizedText = deIdentify(rawInputText);
  return {
    sanitizedText,
    hadRedactions: sanitizedText !== rawInputText,
  };
}
