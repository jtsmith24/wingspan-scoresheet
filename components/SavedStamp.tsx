/** A Saved stamp that settles over its container, fades, and tells you when it's gone. */
export const SavedStamp = ({ onDone }: { onDone: () => void }) => (
  <div className="saved-stamp hand-caps" aria-hidden="true" onAnimationEnd={onDone}>
    Saved
  </div>
);
