import React from 'react';
import './bot-monitor.scss';

const BotMonitor = () => (
    <div className='bot-monitor-wrapper' id='id-bot-monitor'>
        <iframe
            src='/bot-monitor.html'
            title='Deriv Bot Monitor'
            className='bot-monitor-iframe'
            sandbox='allow-scripts allow-same-origin allow-forms'
        />
    </div>
);

export default BotMonitor;
