import { fireEvent, render, screen, within } from '@testing-library/react';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AboutPage from './pages/AboutPage';

let savedSections;
const originalFetch = global.fetch;

beforeEach(() => {
  savedSections = [];
  localStorage.setItem('zerooneAdminToken', 'test-session');
  global.fetch = jest.fn(async (url, options = {}) => {
    if (options.method === 'PUT') {
      const content = JSON.parse(options.body).content;
      const section = { sectionId: content.id, content };
      savedSections = [section];
      return { ok: true, json: async () => ({ section }) };
    }
    return { ok: true, json: async () => ({ sections: savedSections }) };
  });
});

afterEach(() => {
  localStorage.clear();
  global.fetch = originalFetch;
});

test('editor follows public sections and saves the heading and process to the public page', async () => {
  const editor = render(<AdminDashboardPage page="content" />);
  const nav = await screen.findByRole('navigation', { name: 'About page sections' });
  expect(within(nav).getAllByRole('button').map((button) => button.textContent)).toEqual([
    'Who We Are', 'Expertise Cards', 'Company Numbers', 'Capabilities', 'Team'
  ]);
  fireEvent.change(screen.getByLabelText('Section Title'), { target: { value: 'Our company' } });
  fireEvent.change(screen.getByLabelText('Process heading'), { target: { value: 'Our delivery process' } });
  fireEvent.change(screen.getByLabelText('Step 1 description'), { target: { value: 'Understand your workflow first.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Section' }));
  await screen.findByText('About content section saved.');
  expect(savedSections[0].content.highlightStatement.problemSection.solutionSection.steps[0].description)
    .toBe('Understand your workflow first.');
  editor.unmount();
  render(<AboutPage />);
  expect(await screen.findByRole('heading', { name: 'Our company' })).toBeInTheDocument();
  expect(await screen.findByRole('heading', { name: 'Our delivery process' })).toBeInTheDocument();
  expect(screen.getByText('Understand your workflow first.')).toBeInTheDocument();
});

test('capability tags accept new lines, persist, and appear on the public page', async () => {
  const editor = render(<AdminDashboardPage page="content" />);
  const nav = await screen.findByRole('navigation', { name: 'About page sections' });
  fireEvent.click(within(nav).getByRole('button', { name: 'Capabilities' }));
  const tags = screen.getAllByLabelText('Capability tags')[0];
  fireEvent.change(tags, { target: { value: 'Custom platform\n' } });
  expect(tags.value).toBe('Custom platform\n');
  fireEvent.change(tags, { target: { value: 'Custom platform\nNew capability\n' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Section' }));
  await screen.findByText('About content section saved.');
  expect(savedSections[0].content.cards[0].tags).toEqual(['Custom platform', 'New capability']);
  editor.unmount();
  render(<AboutPage />);
  expect(await screen.findByText('New capability')).toBeInTheDocument();
});
