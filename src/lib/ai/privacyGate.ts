export function deIdentify(text: string): string {
  // A simple Regex-based de-identification layer for the prototype.
  // In production, this would use a dedicated NLP model.
  
  let sanitized = text;
  
  // CPF Mask (000.000.000-00)
  sanitized = sanitized.replace(/\d{3}\.\d{3}\.\d{3}-\d{2}/g, '[CPF CENSURADO]');
  
  // HUSM Chart Number (Prontuário ex: 123456/7)
  sanitized = sanitized.replace(/\b\d{5,6}\/\d{1}\b/g, '[PRONTUÁRIO CENSURADO]');
  
  // Common Names (Mock representation)
  // Just replacing some explicit trigger words for the prototype
  sanitized = sanitized.replace(/Paciente (Maria|João|José|Ana|Carlos) [A-Za-z]+/gi, 'Paciente [NOME CENSURADO]');
  
  return sanitized;
}

export function requiresHighPrivacy(text: string): boolean {
  // If we detect highly sensitive markers that might have slipped, we demand local execution.
  // E.g., if there's the word "identificável", we force local.
  return text.toLowerCase().includes('sigilo absoluto');
}
