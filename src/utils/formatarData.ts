// This utility is not strictly needed for the core context scraping for the LLM
// but is kept here if citation formatting becomes a display requirement later.
export function formatarData(data: Date): string {
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0'); // Meses são 0-indexed
  const ano = data.getFullYear();
  return `${dia}/${mes}/${ano}`;
}
