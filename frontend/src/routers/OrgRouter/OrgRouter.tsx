import useLocalStorage from '@rehooks/local-storage';
import { GlobalContextProvider } from '@routers/OrgRouter/context/GlobalContext';
import { useParams } from '@util/react-router/useParams';
import React, { useEffect } from 'react';
import { useToggle } from 'react-use';

import { useAuthContext } from '../../authentication/AuthContext';
import commonStyles from '../../Common.module.scss';
import { ErrorState } from '../../components/ErrorState/ErrorState';
import { Header } from '../../components/Header/Header';
import OnboardingBubble from '../../components/OnboardingBubble/OnboardingBubble';
import { Sidebar } from '../../components/Sidebar/Sidebar';
import { useGetApplicationsQuery } from '../../graph/generated/hooks';
import { useIntegrated } from '../../util/integrated';
import { ApplicationContextProvider } from './ApplicationContext';
import ApplicationRouter from './ApplicationRouter';

export const OrgRouter = () => {
    const { isLoggedIn } = useAuthContext();
    const [
        showKeyboardShortcutsGuide,
        toggleShowKeyboardShortcutsGuide,
    ] = useToggle(false);
    const { organization_id } = useParams<{
        organization_id: string;
    }>();

    const { data, loading, error } = useGetApplicationsQuery({
        variables: { id: organization_id },
        skip: !isLoggedIn, // Higher level routers decide when guests are allowed to hit this router
    });

    const { integrated, loading: integratedLoading } = useIntegrated();
    const [hasFinishedOnboarding] = useLocalStorage(
        `highlight-finished-onboarding-${organization_id}`,
        false
    );

    useEffect(() => {
        window.Intercom('update', {
            hide_default_launcher: true,
        });
        return () => {
            window.Intercom('update', {
                hide_default_launcher: false,
            });
        };
    }, []);

    useEffect(() => {
        if (isLoggedIn) {
            document.documentElement.style.setProperty(
                '--sidebar-width',
                '64px'
            );
        } else {
            document.documentElement.style.setProperty('--sidebar-width', '0');
        }
    }, [isLoggedIn]);

    if (integratedLoading || loading) {
        return null;
    }
    return (
        <GlobalContextProvider
            value={{
                showKeyboardShortcutsGuide,
                toggleShowKeyboardShortcutsGuide,
            }}
        >
            <ApplicationContextProvider
                value={{
                    currentApplication: data?.organization || undefined,
                    allApplications: data?.organizations || [],
                }}
            >
                <Header />
                {isLoggedIn && <Sidebar />}
                <div className={commonStyles.bodyWrapper}>
                    {/* Edge case: shareable links will still direct to this error page if you are logged in on a different org */}
                    {isLoggedIn && (error || !data?.organization) ? (
                        <ErrorState
                            message={`
                        Seems like you don’t have access to this page 😢. If you're
                        part of a team, ask your workspace admin to send you an
                        invite. Otherwise, feel free to make an account!
                        `}
                            errorString={
                                'OrgRouter Error: ' + JSON.stringify(error)
                            }
                        />
                    ) : (
                        <>
                            {isLoggedIn && !hasFinishedOnboarding && (
                                <>
                                    <OnboardingBubble />
                                </>
                            )}
                            <ApplicationRouter integrated={integrated} />
                        </>
                    )}
                </div>
            </ApplicationContextProvider>
        </GlobalContextProvider>
    );
};
