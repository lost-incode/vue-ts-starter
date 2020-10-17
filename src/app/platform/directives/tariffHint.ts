import {VNodeDirective} from "vue";
import {DirectiveOptions} from "vue/types/options";
import {VuexConfiguration} from "../../vuex/vuexConfiguration";

const store = VuexConfiguration.getStore();

/**
 * Директива для показа подсказки о истекшем тарифе
 */
export class TariffHint implements DirectiveOptions {

    /** Имя директивы */
    static NAME = "tariffExpiredHint";

    static processElement(el: HTMLElement): void {
        /** Проверяем истек ли тариф и что это не сама плашка с подсказкой */
        if (!(store as any).getters["MAIN/needBlockInterface"] || el.classList.contains("custom-v-menu")) {
            return;
        }

        el.addEventListener("mouseover", (event) => {
            (store as any).state.MAIN.tariffExpiredHintCoords = {
                x: event.pageX.toString() + "px",
                y: event.pageY.toString() + "px",
                display: "block"
            };
        });
        el.addEventListener("mouseleave", (event: MouseEvent): void => {
            // @ts-ignore
            const toElement = event.relatedTarget || event.toElement;
            /** Условие что бы при ховере на подсказку она не уезжала */
            // noinspection JSDeprecatedSymbols
            if (!(toElement?.className === "custom-v-menu" || toElement?.className === "v-menu-content")) {
                (store as any).state.MAIN.tariffExpiredHintCoords = {
                    x: "0px",
                    y: "0px",
                    display: "none"
                };
            }
        });
        /** Добавляем класс для блюринга блока */
        el.classList.toggle("blur", true);
    }

    /**
     * @param {HTMLElement} el html элемент
     */
    bind(el: HTMLElement): void {
        TariffHint.processElement(el);
    }

    update(el: HTMLElement, binding: VNodeDirective): void {
        TariffHint.processElement(el);
    }
}
