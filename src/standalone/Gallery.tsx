import '../playlab/styles/playlab.css';
import { ILLUSTRATION_IDS, Illustration } from '../playlab/illustrations/Illustration';

/** Dev/design tool: open /?gallery to review every bundled illustration (the assets a design team may replace). */
export function Gallery() {
  return (
    <div className="pl-root p-4">
      <h1 className="font-display text-2xl font-bold">PlayLab illustration gallery ({ILLUSTRATION_IDS.length})</h1>
      <ul className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
        {ILLUSTRATION_IDS.map((id) => (
          <li key={id} className="rounded-2xl bg-white p-2 text-center shadow-soft">
            <Illustration name={id} className="mx-auto h-20 w-20" label={id} />
            <p className="mt-1 text-xs">{id}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
