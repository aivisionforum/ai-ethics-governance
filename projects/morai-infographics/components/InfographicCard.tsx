import React from 'react';
import { Principle } from '../types';

interface InfographicCardProps {
  principle: Principle;
  onMouseEnterCard: (principle: Principle, rect: DOMRect) => void;
  onMouseLeaveCard: () => void;
}

const InfographicCard: React.FC<InfographicCardProps> = ({ principle, onMouseEnterCard, onMouseLeaveCard }) => {
  return (
    <div
      className="bg-white rounded-xl shadow-lg p-6 md:p-8 flex flex-col items-center text-center transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-2xl cursor-pointer relative"
      onMouseEnter={(e) => onMouseEnterCard(principle, e.currentTarget.getBoundingClientRect())}
      onMouseLeave={onMouseLeaveCard}
      aria-haspopup="dialog"
      aria-expanded={false} // Will be managed by the popover itself
    >
      <div className="text-5xl md:text-6xl mb-4" role="img" aria-label={principle.title}>
        {principle.icon}
      </div>
      <h3 className="text-xl md:text-2xl font-semibold text-indigo-700 mb-2">
        {principle.title}
      </h3>
      <p className="text-base text-gray-600 leading-relaxed">
        {principle.description}
      </p>
    </div>
  );
};

export default InfographicCard;