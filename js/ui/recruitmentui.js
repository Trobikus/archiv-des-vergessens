// ============================================================
// FILE: js/ui/recruitmentui.js – Rekrutierung
// ============================================================
import { ROLES } from '../models/clanmember.js';
import { EVENTS } from '../core/events.js';

export default class RecruitmentUI {
    constructor(context) {
        this.eventBus = context.eventBus;
        this.clanManager = context.clanManager;
        this.resourceManager = context.resourceManager;

        this.btnCollector = document.getElementById('recruit-collector');
        this.btnWeaver = document.getElementById('recruit-weaver');
        this.btnGuardian = document.getElementById('recruit-guardian');

        this.btnCollector.addEventListener('click', () => this._requestRecruit(ROLES.COLLECTOR, 10));
        this.btnWeaver.addEventListener('click', () => this._requestRecruit(ROLES.WEAVER, 25));
        this.btnGuardian.addEventListener('click', () => this._requestRecruit(ROLES.GUARDIAN, 40));

        this.eventBus.subscribe(EVENTS.RESOURCES_UPDATED, this._updateButtons.bind(this));
        this._updateButtons({ particles: 0 });
    }

    _requestRecruit(role, cost) {
        this.eventBus.publish(EVENTS.CLAN_RECRUIT_MEMBER, { role, cost });
    }

    _updateButtons(data) {
        const p = data.particles || 0;
        this.btnCollector.disabled = (p < 10);
        this.btnWeaver.disabled = (p < 25);
        this.btnGuardian.disabled = (p < 40);
    }
}