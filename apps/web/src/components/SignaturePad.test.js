import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SignaturePad from './SignaturePad';

test('drawn signature records scaled strokes and can be cleared', () => {
  const oldPointerEvent = window.PointerEvent;
  const oldCapture = HTMLElement.prototype.setPointerCapture;
  window.PointerEvent = class extends MouseEvent {
    constructor(type, init) { super(type, init); this.pointerId = init.pointerId; this.pointerType = init.pointerType; }
  };
  HTMLElement.prototype.setPointerCapture = jest.fn();
  function Harness() { const [value, setValue] = useState([]); return <><SignaturePad value={value} onChange={setValue} /><output data-testid="points">{JSON.stringify(value)}</output></>; }
  try {
    render(<Harness />);
    const pad = screen.getByLabelText('Draw your signature');
    pad.getBoundingClientRect = () => ({ left: 0, top: 0, width: 600, height: 180 });
    fireEvent.pointerDown(pad, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 60, clientY: 36 });
    fireEvent.pointerMove(pad, { pointerId: 1, pointerType: 'mouse', clientX: 300, clientY: 90 });
    fireEvent.pointerUp(pad, { pointerId: 1, pointerType: 'mouse' });
    expect(screen.getByTestId('points')).toHaveTextContent('[[[0.1,0.2],[0.5,0.5]]]');
    expect(pad.querySelector('polyline')).toHaveAttribute('points', '60,36 300,90');
    fireEvent.click(screen.getByRole('button', { name: 'Clear signature' }));
    expect(screen.getByTestId('points')).toHaveTextContent('[]');
  } finally { window.PointerEvent = oldPointerEvent; HTMLElement.prototype.setPointerCapture = oldCapture; }
});
