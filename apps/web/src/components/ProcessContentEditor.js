const inputClass = 'w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 focus:border-[#817391] focus:bg-white';

export default function ProcessContentEditor({ process, onChange }) {
  return (
    <fieldset className="grid gap-4 rounded-lg border border-slate-200 p-4">
      <legend className="px-2 text-lg font-bold text-slate-950">How We Work</legend>
      <p className="text-sm text-slate-500">The process shown below the company numbers on the About Us page.</p>
      {['eyebrow', 'title', 'intro'].map((field) => (
        <label className="grid gap-2 text-sm font-bold text-slate-800" key={field}>
          {field === 'eyebrow' ? 'Process label' : field === 'title' ? 'Process heading' : 'Process introduction'}
          <textarea className={inputClass} rows={field === 'intro' ? 3 : 1} value={process[field] || ''}
            onChange={(event) => onChange({ ...process, [field]: event.target.value })} />
        </label>
      ))}
      {(process.steps || []).map((step, index) => (
        <div className="grid gap-3 rounded-lg border border-slate-200 p-4" key={index}>
          <label className="grid gap-2 text-sm font-bold text-slate-800">
            Step {index + 1} title
            <input className={inputClass} value={step.title || ''} onChange={(event) => onChange({ ...process,
              steps: process.steps.map((item, i) => i === index ? { ...item, title: event.target.value } : item)
            })} />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-800">
            Step {index + 1} description
            <textarea className={inputClass} rows={3} value={step.description || ''} onChange={(event) => onChange({ ...process,
              steps: process.steps.map((item, i) => i === index ? { ...item, description: event.target.value } : item)
            })} />
          </label>
        </div>
      ))}
    </fieldset>
  );
}
