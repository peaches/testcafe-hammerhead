import SandboxBase from '../base';
import MessageSandbox from '../event/message';
import settings from '../../settings';
import nativeMethods from '../native-methods';
import EventSandbox from '../event';
import * as windowsStorage from '../windows-storage';
import getRandomInt16Value from '../../utils/get-random-int-16-value';
import * as domUtils from '../../utils/dom';
import * as urlUtils from '../../utils/url';
import { SPECIAL_BLANK_PAGE } from '../../../utils/url';
import { OpenedWindowInfo } from '../../../typings/client';
import DefaultTarget from './default-target';
import isKeywordTarget from '../../../utils/is-keyword-target';

const DEFAULT_WINDOW_PARAMETERS = 'width=500px, height=500px';

export default class ChildWindowSandbox extends SandboxBase {
    readonly WINDOW_OPENED_EVENT = 'hammerhead|event|window-opened';

    // @ts-ignore
    constructor (private readonly _messageSandbox: MessageSandbox,
        private readonly _eventSandbox: EventSandbox) {
        super();
    }

    private static _shouldOpenInNewWindow (target: string, defaultTarget: string): boolean {
        target = target || defaultTarget;
        target = target.toLowerCase();

        if (isKeywordTarget(target))
            return target === '_blank';

        return !windowsStorage.findByName(target);
    }

    private _openUrlInNewWindow (url: string, windowName?: string, windowParams?: string, window?: Window): OpenedWindowInfo {
        const windowId = getRandomInt16Value().toString();

        windowParams = windowParams || DEFAULT_WINDOW_PARAMETERS;
        windowName   = windowName || windowId;

        const newPageUrl = urlUtils.getPageProxyUrl(url, windowId);
        const targetWindow = window || this.window;
        const openedWindow = nativeMethods.windowOpen.call(targetWindow, newPageUrl, windowName, windowParams);

        this.emit(this.WINDOW_OPENED_EVENT, { windowId, window: openedWindow });

        return { windowId, wnd: openedWindow };
    }

    handleClickOnLinkOrArea(el: HTMLLinkElement | HTMLAreaElement): void {
        if (!settings.get().allowMultipleWindows)
            return;

        this._eventSandbox.listeners.initElementListening(el, ['click']);
        this._eventSandbox.listeners.addInternalEventListener(el, ['click'], (_e, _dispatched, preventEvent, _cancelHandlers, stopEventPropagation) => {
            if (!ChildWindowSandbox._shouldOpenInNewWindow(el.target, DefaultTarget.linkOrArea))
                return;

            // TODO: need to check that specified 'area' are clickable (initiated new page opening)
            const url = nativeMethods.anchorHrefGetter.call(el);

            this._openUrlInNewWindow(url);

            preventEvent();
            stopEventPropagation();
        });
    }

    handleWindowOpen (window: Window, args: any[]): Window {
        const [url, target, parameters] = args;

        if (settings.get().allowMultipleWindows && ChildWindowSandbox._shouldOpenInNewWindow(target, DefaultTarget.windowOpen)) {
            const openedWindowInfo = this._openUrlInNewWindow(url, target, parameters, window);

            return openedWindowInfo.wnd;
        }

        return nativeMethods.windowOpen.apply(window, args);
    }

    _handleFormSubmitting (window: Window): void {
        if (!settings.get().allowMultipleWindows)
            return;

        this._eventSandbox.listeners.initElementListening(window, ['submit']);
        this._eventSandbox.listeners.addInternalEventListener(window, ['submit'], e => {
            if (!domUtils.isFormElement(e.target))
                return;

            const form = e.target;

            if (!ChildWindowSandbox._shouldOpenInNewWindow(form.target, DefaultTarget.form))
                return;

            const aboutBlankUrl = urlUtils.getProxyUrl(SPECIAL_BLANK_PAGE);
            const openedInfo    = this._openUrlInNewWindow(aboutBlankUrl);
            const formAction    = nativeMethods.formActionGetter.call(form);
            const newWindowUrl  = urlUtils.getPageProxyUrl(formAction, openedInfo.windowId);

            nativeMethods.formActionSetter.call(form, newWindowUrl);
            nativeMethods.formTargetSetter.call(form, openedInfo.windowId);

            // TODO: On hammerhead start we need to clean up the window.name
            // It's necessary for form submit.
            // Also we need clean up the form target to the original value.
        });
    }

    attach(window: Window): void {
        super.attach(window, window.document);
        this._handleFormSubmitting(window);
    }
}
