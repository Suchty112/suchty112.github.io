    // ==UserScript==
    // @name         toggleExtensions
    // @version      1.0.5
    // @description  Ausbauten von Gebäuden komplett (de-)aktivieren
    // @author       DrTraxx/Edit by Sanni
    // @match        https://www.leitstellenspiel.de/*
    // @match        https://polizei.leitstellenspiel.de/*
    // @grant        GM_addStyle
    // ==/UserScript==
    /* global $ */

    (async function() {

        const aBuildings = await $.getJSON("/api/buildings"),
            aBuildingTypes = await $.getJSON("https://suchty112.github.io/buildingtypes.json"),
            noActivailableExtensions = ["Abrollbehälter-Stellplatz", "Anhänger-Stellplatz", "Großwache", "Zelle", "Großgewahrsam", "Ortsverbands-Mannschaftstransportwagen", "Außenlastbehälter"];

        let targetBuildings;

        GM_addStyle(`
            .modal {
                display: none;
                position: fixed; /* Stay in place front is invalid - may break your css so removed */
                padding-top: 100px;
                left: 0;
                right:0;
                top: 0;
                bottom: 0;
                overflow: auto;
                background-color: rgb(0,0,0);
                background-color: rgba(0,0,0,0.4);
                z-index: 9999;
            }
            .modal-body{
                height: 650px;
                overflow-y: auto;
            }`);

        $("body")
            .prepend(
                `<div class="modal fade bd-example-modal-lg" id="toExModal" tabindex="-1" role="dialog" aria-labelledby="myLargeModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-lg" role="document">
                        <div class="modal-content">
                            <div class="modal-header">
                                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                    <span aria-hidden="true">&#x274C;</span>
                                </button>
                                <h3 class="modal-title"><center>Gebäudeerweiterungen (de-)aktivieren</center></h3>
                                <div class="btn-group" style="display:flex;">
                                    <a class="btn btn-xs btn-success to_ex_choose" style="flex:1;" target="fire_stations">Feuerwachen</a>
                                    <a class="btn btn-xs btn-success to_ex_choose" style="flex:1;" target="police_stations">Polizeiwachen</a>
                                    <a class="btn btn-xs btn-success to_ex_choose" style="flex:1;" target="thw">THW-Ortsverbände</a>
                                    <a class="btn btn-xs btn-success to_ex_choose" style="flex:1;" target="bereitschaftspolizei">Bereitschaftspolizei</a>
                                </div>
                                <div class="btn-group" style="display:flex;">
                                    <a class="btn btn-xs btn-success to_ex_choose" style="flex:1;" target="sek">Polizeisondereinheiten</a>
                                    <a class="btn btn-xs btn-success to_ex_choose" style="flex:1;" target="police_helicopter_stations">Polizeihubschrauberstationen</a>
                                    <a class="btn btn-xs btn-success to_ex_choose" style="flex:1;" target="seg">SEG-Wachen</a>
                                    <a class="btn btn-xs btn-success to_ex_choose" style="flex:1;" target="hospital">Krankenhäuser</a>
                                </div>
                                <div class="btn-group" style="display:flex;">
                                    <a class="btn btn-xs btn-success to_ex_choose" style="flex:1;" target="bergwacht">Bergrettungswachen</a>
                                    <a class="btn btn-xs btn-success to_ex_choose" style="flex:1;" target="rth">Rettungshubschrauber-Station</a>
                                </div>
                            </div>
                            <div class="modal-body" id="toExModalBody">
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-danger" data-dismiss="modal">Schließen</button>
                                <div class="pull-left">v ${ GM_info.script.version }</div>
                            </div>
                        </div>
                    </div>
                </div>`);

        $("ul .dropdown-menu[aria-labelledby='menu_profile'] >> a[href*='peed']")
            .parent()
            .after(`<li role="presentation">
                        <a data-toggle="modal" data-target="#toExModal" style="cursor:pointer" id="toExOpenModal">
                            <span class="glyphicon glyphicon-cog"></span> Gebäudeeinstellungen
                        </a>
                    </li>`);

        const buildModalHtml = (buildingType) => {

            targetBuildings = aBuildings.filter(b => b.building_type === buildingType.id);

            let modalBodyHtml = `<h4>${ buildingType.name } - ${ targetBuildings.length } Gebäude</h4><br><br>`;

            for (const extension of buildingType.extensions) {
                if (!noActivailableExtensions.includes(extension.name)) {
                    modalBodyHtml += `<div class="panel panel-default">
                                        <div class="panel-heading">
                                            <h5>${ extension.name }</h5>
                                        </div>
                                        <div class="panel-body">
                                            <div class="btn-group">
                                                <a class="btn btn-success btn-xs to_ex_toggle" extension_id="${ extension.id }">aktivieren</a>
                                                <a class="btn btn-danger btn-xs to_ex_toggle" extension_id="${ extension.id }">deaktivieren</a>
                                            </div>
                                            <div class="progress hidden" style="margin-top:2em">
                                                <div class="progress-bar bg-success" role="progressbar" style="width: 0%;color: black" aria-valuenow="0" aria-valuemin="0" aria-valuemax="0" id="to_ex_extension_${ extension.id }"></div>
                                            </div>
                                        </div>
                                    </div>`;
                }
            }

            $("#toExModalBody").html(modalBodyHtml);
        };

        const toggleExtensionActivity = async (extensionId, enable) => {
            const toggleActivityBuildings = [];

            let count = 0;

            for (const building of targetBuildings) {
                const searchedExtension = building.extensions.find(e => e.type_id == extensionId);
                if (searchedExtension && searchedExtension.available) {
                    if (searchedExtension.enabled !== enable) {
                        toggleActivityBuildings.push(building.id);
                    }
                }
            }

            if (toggleActivityBuildings.length === 0) {
                alert("Es gibt keine Ausbauten zu (de-)aktiveren.");
                return;
            }

            $(`#to_ex_extension_${ extensionId }`)
                .attr("aria-valuemax", toggleActivityBuildings.length)
                .text(`0 / ${ toggleActivityBuildings.length.toLocaleString() }`)
                .parent().removeClass("hidden");

            for (var i in toggleActivityBuildings) {
                count++;
                const percent = Math.round(count / toggleActivityBuildings.length * 100),
                    e = toggleActivityBuildings[i];
                $(`#to_ex_extension_${ extensionId }`)
                    .attr("aria-valuenow", count)
                    .css({
                        "width": percent + "%"
                    })
                    .text(count.toLocaleString() + " / " + toggleActivityBuildings.length.toLocaleString());
                await $.post(`/buildings/${ e }/extension_ready/${ extensionId }/${ e }`);
                aBuildings.find(b => b.id == e).extensions.find(x => x.type_id == extensionId).enabled = enable;
            }

            $(`#to_ex_extension_${ extensionId }`)
                .parent()
                .after(`<div class="alert alert-success to_ex_success" onclick="$(this).remove()">Erweiterungen erfolgreich (de-)aktiviert!</div>`);
        };

        $("body").on("click", ".to_ex_choose", function() {
            const $this = $(this),
                target = $this.attr("target");

            if (target === "hospital") {
                buildModalHtml(aBuildingTypes.find(t => t.id === 4));
            } else {
                buildModalHtml(aBuildingTypes.find(t => t.class[0] === target));
            }
        });

        $("body").on("click", ".to_ex_toggle", function() {
            const $this = $(this),
                extensionId = +$this.attr("extension_id"),
                enable = $this.text() === "aktivieren" ? true : false;

            if ($this.attr("disabled") === "disabled") return;

            if (confirm(`Willst du wirklich alle Ausbauten dieses Typs ${ $this.text() }?`) === true) {
                toggleExtensionActivity(extensionId, enable);
            }
        });

    })();