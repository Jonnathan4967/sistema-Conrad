import React, { useState } from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({ 
  text, 
  children, 
  position = 'top' 
}) => {
  const [show, setShow] = useState(false);

  const positions = {
    top: 'bottom-full mb-2 left-1/2 transform -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 transform -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 transform -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 transform -translate-y-1/2'
  };

  const arrows = {
    top: 'top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800',
    bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-gray-800',
    left: 'left-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-l-gray-800',
    right: 'right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-gray-800'
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className={`absolute z-10 ${positions[position]} pointer-events-none`}>
          <div className="bg-gray-800 text-white text-[11px] rounded py-1 px-2 whitespace-nowrap shadow-lg">
            {text}
            <div className={`absolute ${arrows[position]}`} />
          </div>
        </div>
      )}
    </div>
  );
};
