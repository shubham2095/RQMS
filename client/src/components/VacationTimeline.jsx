import StatusBadge from './StatusBadge';
import { CLEARANCE_STEP_LABELS } from '../utils/constants';
import formatDate from '../utils/formatDate';

// Informational values jo step par record hue (approve ko block nahi karte)
function capturedValues(clearance) {
  const values = [];
  if (clearance.has_damage !== null) values.push(`Damage found: ${clearance.has_damage ? 'Yes' : 'No'}`);
  if (clearance.meter_reading !== null) values.push(`Meter reading: ${clearance.meter_reading}`);
  if (clearance.dues_amount !== null) values.push(`Dues recorded: ${clearance.dues_amount}`);
  return values;
}

// 5-step clearance timeline. request = vacation detail (clearances sequence order mein).
function VacationTimeline({ request }) {
  const closed = request.status === 'rejected';

  return (
    <ol className="timeline">
      {request.clearances.map((clearance) => {
        const isCurrent = request.status === 'in_clearance' && request.current_step === clearance.step;
        const notReached = closed && clearance.status === 'pending';
        const values = capturedValues(clearance);

        return (
          <li key={clearance.id} className={`timeline-item${isCurrent ? ' timeline-current' : ''}`}>
            <div className="timeline-head">
              <span className="timeline-number">{clearance.sequence}</span>
              <strong>{CLEARANCE_STEP_LABELS[clearance.step]}</strong>
              <StatusBadge status={clearance.status} />
              {isCurrent && <span className="timeline-awaiting">Awaiting action</span>}
              {notReached && <span className="muted small">not reached</span>}
            </div>
            {clearance.acted_at && (
              <p className="muted small">
                {clearance.status === 'approved' ? 'Approved' : 'Rejected'} by{' '}
                {clearance.handler ? clearance.handler.name : '-'} on {formatDate(clearance.acted_at)}
              </p>
            )}
            {values.length > 0 && <p className="small">{values.join(' · ')}</p>}
            {clearance.remarks && <p className="small">Remarks: {clearance.remarks}</p>}
          </li>
        );
      })}
    </ol>
  );
}

export default VacationTimeline;
