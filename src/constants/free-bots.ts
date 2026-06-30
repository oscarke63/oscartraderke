import { localize } from '@deriv-com/translations';

export type TFreeBot = {
    id: string;
    name: string;
    xml?: string;
    description: string;
    category: 'standard' | 'accumulator' | 'advanced';
    type: 'blockly' | 'download' | 'inline';
    download_url?: string;
    badge?: string;
};

export const FREE_BOTS: TFreeBot[] = [
    {
        id: '5-tick-pattern',
        name: localize('5-Tick Pattern'),
        description: localize('Detects 5 consecutive same-direction ticks and fires entries with martingale ×2, up to 3 steps, rotating between V25 and V100. Uses your existing session.'),
        category: 'advanced',
        type: 'inline',
        badge: localize('LOW-LATENCY'),
    },
    {
        id: 'martingale',
        name: localize('Martingale'),
        xml: 'martingale.xml',
        description: localize('Increase your stake after each loss to recoup prior losses with a single successful trade.'),
        category: 'standard',
        type: 'blockly',
    },
    {
        id: 'martingale_max-stake',
        name: localize('Martingale (Max Stake)'),
        xml: 'martingale_max-stake.xml',
        description: localize('Martingale strategy with a configurable maximum stake limit for risk management.'),
        category: 'standard',
        type: 'blockly',
    },
    {
        id: 'dalembert',
        name: localize("D'Alembert"),
        xml: 'dalembert.xml',
        description: localize('Increase your stake by one unit after each loss and decrease by one unit after each win.'),
        category: 'standard',
        type: 'blockly',
    },
    {
        id: 'dalembert_max-stake',
        name: localize("D'Alembert (Max Stake)"),
        xml: 'dalembert_max-stake.xml',
        description: localize("D'Alembert strategy with a configurable maximum stake limit for risk management."),
        category: 'standard',
        type: 'blockly',
    },
    {
        id: 'reverse_martingale',
        name: localize('Reverse Martingale'),
        xml: 'reverse_martingale.xml',
        description: localize('Increase your stake after each win and reset after each loss to capitalise on winning streaks.'),
        category: 'standard',
        type: 'blockly',
    },
    {
        id: 'reverse_dalembert',
        name: localize('Reverse D\'Alembert'),
        xml: 'reverse_dalembert.xml',
        description: localize('Increase your stake by one unit after each win and decrease after each loss.'),
        category: 'standard',
        type: 'blockly',
    },
    {
        id: 'oscars_grind',
        name: localize("Oscar's Grind"),
        xml: 'oscars_grind.xml',
        description: localize('A positive progression system where you increase your stake after wins to recover losses gradually.'),
        category: 'standard',
        type: 'blockly',
    },
    {
        id: 'oscars_grind_max-stake',
        name: localize("Oscar's Grind (Max Stake)"),
        xml: 'oscars_grind_max-stake.xml',
        description: localize("Oscar's Grind strategy with a configurable maximum stake limit for risk management."),
        category: 'standard',
        type: 'blockly',
    },
    {
        id: '1_3_2_6',
        name: localize('1-3-2-6'),
        xml: '1_3_2_6.xml',
        description: localize('A positive betting system that uses a sequence of stake multipliers to capitalise on winning streaks.'),
        category: 'standard',
        type: 'blockly',
    },
    {
        id: 'accumulators_martingale',
        name: localize('Accumulators Martingale'),
        xml: 'accumulators_martingale.xml',
        description: localize('Martingale strategy applied to accumulator contracts for compounding growth.'),
        category: 'accumulator',
        type: 'blockly',
    },
    {
        id: 'accumulators_martingale_on_stat_reset',
        name: localize('Accumulators Martingale (Stat Reset)'),
        xml: 'accumulators_martingale_on_stat_reset.xml',
        description: localize('Martingale strategy for accumulators that resets statistics after each completed cycle.'),
        category: 'accumulator',
        type: 'blockly',
    },
    {
        id: 'accumulators_dalembert',
        name: localize('Accumulators D\'Alembert'),
        xml: 'accumulators_dalembert.xml',
        description: localize("D'Alembert strategy applied to accumulator contracts for consistent growth."),
        category: 'accumulator',
        type: 'blockly',
    },
    {
        id: 'accumulators_dalembert_on_stat_reset',
        name: localize('Accumulators D\'Alembert (Stat Reset)'),
        xml: 'accumulators_dalembert_on_stat_reset.xml',
        description: localize("D'Alembert strategy for accumulators that resets statistics after each completed cycle."),
        category: 'accumulator',
        type: 'blockly',
    },
    {
        id: 'accumulators_reverse_martingale',
        name: localize('Accumulators Reverse Martingale'),
        xml: 'accumulators_reverse_martingale.xml',
        description: localize('Reverse Martingale strategy applied to accumulator contracts.'),
        category: 'accumulator',
        type: 'blockly',
    },
    {
        id: 'accumulators_reverse_martingale_on_stat_reset',
        name: localize('Accumulators Reverse Martingale (Stat Reset)'),
        xml: 'accumulators_reverse_martingale_on_stat_reset.xml',
        description: localize('Reverse Martingale for accumulators that resets statistics after each completed cycle.'),
        category: 'accumulator',
        type: 'blockly',
    },
    {
        id: 'accumulators_reverse_dalembert',
        name: localize('Accumulators Reverse D\'Alembert'),
        xml: 'accumulators_reverse_dalembert.xml',
        description: localize('Reverse D\'Alembert strategy applied to accumulator contracts.'),
        category: 'accumulator',
        type: 'blockly',
    },
    {
        id: 'accumulators_reverse_dalembert_on_stat_reset',
        name: localize('Accumulators Reverse D\'Alembert (Stat Reset)'),
        xml: 'accumulators_reverse_dalembert_on_stat_reset.xml',
        description: localize('Reverse D\'Alembert for accumulators that resets statistics after each completed cycle.'),
        category: 'accumulator',
        type: 'blockly',
    },
];
