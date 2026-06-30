import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { load } from '@/external/bot-skeleton';
import { save_types } from '@/external/bot-skeleton/constants/save-type';
import { useStore } from '@/hooks/useStore';
import { DBOT_TABS } from '@/constants/bot-contents';
import { FREE_BOTS, TFreeBot } from '@/constants/free-bots';
import Text from '@/components/shared_ui/text';
import { LegacyPlay1pxIcon } from '@deriv/quill-icons/Legacy';
import { Localize, localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';
import FiveTickPattern from './five-tick-pattern';
import './free-bots.scss';

const FreeBots = observer(() => {
    const { dashboard } = useStore();
    const { setActiveTab } = dashboard;
    const { isDesktop } = useDevice();
    const [loading_id, setLoadingId] = useState<string | null>(null);
    const [activeInlineBot, setActiveInlineBot] = useState<string | null>(null);

    const loadBot = async (bot: TFreeBot) => {
        if (loading_id) return;

        if (bot.type === 'inline') {
            setActiveInlineBot(bot.id);
            return;
        }

        if (bot.type === 'download') {
            window.open(bot.download_url, '_blank');
            return;
        }

        if (!bot.xml) return;
        setLoadingId(bot.id);
        try {
            const xmlModule = await import(/* webpackChunkName: `free-bot-[request]` */ `../../xml/${bot.xml}`);
            const xmlString = xmlModule.default;
            const workspace = window.Blockly.derivWorkspace;
            if (!workspace) {
                setActiveTab(DBOT_TABS.BOT_BUILDER);
                const checkWorkspace = setInterval(() => {
                    if (window.Blockly.derivWorkspace) {
                        clearInterval(checkWorkspace);
                        load({
                            block_string: xmlString,
                            file_name: bot.name,
                            workspace: window.Blockly.derivWorkspace,
                            from: save_types.UNSAVED,
                            drop_event: null,
                            strategy_id: null,
                            showIncompatibleStrategyDialog: false,
                        });
                    }
                }, 500);
                return;
            }
            await load({
                block_string: xmlString,
                file_name: bot.name,
                workspace,
                from: save_types.UNSAVED,
                drop_event: null,
                strategy_id: null,
                showIncompatibleStrategyDialog: false,
            });
            setActiveTab(DBOT_TABS.BOT_BUILDER);
        } catch (e) {
            console.error('Failed to load free bot:', e);
        } finally {
            setLoadingId(null);
        }
    };

    if (activeInlineBot === '5-tick-pattern') {
        return <FiveTickPattern onClose={() => setActiveInlineBot(null)} />;
    }

    const standard_bots = FREE_BOTS.filter(b => b.category === 'standard');
    const accumulator_bots = FREE_BOTS.filter(b => b.category === 'accumulator');
    const advanced_bots = FREE_BOTS.filter(b => b.category === 'advanced');

    const renderBotCard = (bot: TFreeBot) => {
        const is_loading = loading_id === bot.id;
        const is_download = bot.type === 'download' || bot.type === 'inline';
        return (
            <div
                key={bot.id}
                className={
                    'free-bots__card' +
                    (is_loading ? ' free-bots__card--loading' : '') +
                    (is_download ? ' free-bots__card--download' : '')
                }
                onClick={() => loadBot(bot)}
            >
                <div className='free-bots__card-icon'>
                    <LegacyPlay1pxIcon height='32px' width='32px' fill='var(--text-general)' />
                </div>
                <div className='free-bots__card-info'>
                    <div className='free-bots__card-title-row'>
                        <Text size={isDesktop ? 's' : 'xs'} weight='bold' color='prominent'>
                            {bot.name}
                        </Text>
                        {bot.badge && (
                            <span className='free-bots__badge'>{bot.badge}</span>
                        )}
                        {is_download && (
                            <span className='free-bots__badge free-bots__badge--download'>
                                <Localize i18n_default_text='IN-APP' />
                            </span>
                        )}
                    </div>
                    <Text size={isDesktop ? 'xs' : 'xxs'} color='less-prominent'>
                        {bot.description}
                    </Text>
                </div>
                {is_loading && <div className='free-bots__card-loader' />}
            </div>
        );
    };

    return (
        <div className='free-bots'>
            <div className='free-bots__header'>
                <Text as='h2' color='prominent' size={isDesktop ? 'sm' : 's'} lineHeight='xxl' weight='bold'>
                    <Localize i18n_default_text='Free Bots' />
                </Text>
                <Text as='p' color='prominent' lineHeight='s' size={isDesktop ? 's' : 'xxs'}>
                    <Localize i18n_default_text='Choose from our collection of pre-built trading bots to get started quickly.' />
                </Text>
            </div>

            {advanced_bots.length > 0 && (
                <div className='free-bots__section'>
                    <Text as='h3' color='prominent' size={isDesktop ? 's' : 'xs'} weight='bold'>
                        <Localize i18n_default_text='Advanced Bots' />
                    </Text>
                    <div className='free-bots__grid'>
                        {advanced_bots.map(renderBotCard)}
                    </div>
                </div>
            )}

            <div className='free-bots__section'>
                <Text as='h3' color='prominent' size={isDesktop ? 's' : 'xs'} weight='bold'>
                    <Localize i18n_default_text='Standard Strategies' />
                </Text>
                <div className='free-bots__grid'>
                    {standard_bots.map(renderBotCard)}
                </div>
            </div>

            <div className='free-bots__section'>
                <Text as='h3' color='prominent' size={isDesktop ? 's' : 'xs'} weight='bold'>
                    <Localize i18n_default_text='Accumulator Strategies' />
                </Text>
                <div className='free-bots__grid'>
                    {accumulator_bots.map(renderBotCard)}
                </div>
            </div>
        </div>
    );
});

export default FreeBots;
