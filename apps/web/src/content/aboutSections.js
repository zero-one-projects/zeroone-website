// The public page and its editor use the same visibility rules.
export function getVisibleAboutSections(sections) {
  return sections.filter(({ id }) => !['business-partner', 'vision', 'mission'].includes(id));
}
