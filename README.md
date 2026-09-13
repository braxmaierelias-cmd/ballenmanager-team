# FarmManager V13 – Felder separat + Bearbeiten

Menü:
1. Dashboard
2. Arbeitszeit
3. Live Karte
4. Verkauf
5. Aufträge
6. Felder
7. Kunden
8. Kalender
9. Maschinen
10. Bestand
11. Team

Neu:
- Eigene Kategorie Felder direkt nach Aufträge
- Alle Felder in einer Liste
- Feldgrenzen auf Karte einzeichnen
- Notizen direkt am Feld
- Kunde optional zuordnen und später ändern
- Kundenseite zeigt zugeordnete Felder
- Auftragserstellung zeigt Kundenfelder
- Eigene gespeicherte Arbeitstage nachträglich bearbeiten/ergänzen
- Abgeschlossene Aufträge wieder bearbeiten

Google Maps:
Für eine echte Google-Karte wird ein Google Maps Platform API-Key benötigt. Bis dieser hinterlegt ist, bleibt die bereits funktionsfähige Kartenansicht aktiv. Die Datenstruktur ist dafür vorbereitet.

Wichtig: app.js bleibt unverändert.


## V13.1 Fix
- Kartenansicht auf iPad/Safari stabilisiert
- Leaflet/Leaflet Draw auf jsDelivr umgestellt
- Felder können jetzt auch ohne Kundenzuordnung eingezeichnet werden
- „+ Neues Feld“ initialisiert die Karte zuverlässig
- Kartengröße wird nach Navigation/Rotation neu berechnet


## V13.2 Kartenfix
- Doppelinitialisierung der Feldkarte behoben
- Safari/iPad: vorhandene Leaflet-Karte wird wiederverwendet
- Polygon-Zeichenfunktion ohne verpflichtende Kundenauswahl


## V13.3 Kartenfix
- Feldkarte wird beim Öffnen vollständig frisch erzeugt
- Alte/störende Leaflet-Instanzen werden entfernt
- Eigener Untercontainer verhindert 'Map container already initialized'
- Fehlertext wird direkt rechts oben angezeigt, falls doch noch etwas scheitert


## V13.4 – Leaflet-Konflikt behoben
- Ursache gefunden: app.js verwendet bereits die Variable `L` für Status-Texte.
- Leaflet wird deshalb ab jetzt explizit über `window.L` angesprochen.
- Feldkarte, Polygon-Zeichnen und vorhandene Feldgrenzen verwenden den richtigen Karten-Namespace.

## V13.5 – Polygon-Zeichenwerkzeug Fix
- Leaflet und Leaflet Draw werden jetzt vor `app.js` geladen.
- Ursache: `app.js` benutzt bereits den Namen `L` für Statustexte. Dadurch konnte Leaflet Draw sich vorher nicht korrekt an Leaflet anhängen.
- Die Karte bleibt über `window.L` angesprochen.
- Das Polygon-Zeichenwerkzeug sollte jetzt oben links neben Zoom erscheinen.

## V13.6 – eigenes touch-taugliches Zeichenwerkzeug
- Leaflet Draw vollständig entfernt, weil es mit der bestehenden globalen Variable `L` kollidiert.
- Neues eigenes Zeichenwerkzeug direkt auf Basis von `window.L`.
- „Feld einzeichnen“ → Eckpunkte antippen → „Fertig“.
- „Punkt zurück“ und „Abbrechen“ vorhanden.
- Fläche wird weiterhin automatisch in ha berechnet.
- Funktioniert ohne Leaflet-Draw-Plugin und ist damit robuster auf iPad/Safari.

## V13.7 – Bedienungsupdate
- Kunden können gelöscht werden, wenn keine Aufträge mehr verknüpft sind.
- Eigene abgeschlossene Arbeitszeiten können gelöscht werden.
- Maschinen: zuerst Übersicht, oben rechts „+ Neue Maschine“.
- Bestand: Güter können gelöscht werden, solange sie nicht in aktiven Aufträgen genutzt werden.
- Team: zuerst Mitglieder, oben rechts für Admins „+ Mitglied anlegen“.
- Aktive Aufträge können vollständig bearbeitet werden.
- `app.js` bleibt unverändert.
- Neu hinzugekommen: `uiupdate.js`.

## V13.8 – Aufträge, Löschen und manuelle Sortierung
- Kunden können jetzt immer gelöscht werden. Aufträge und Arbeitszeiten bleiben erhalten und verlieren nur die Kundenzuordnung.
- Aktive Aufträge: Bearbeiten + Löschen.
- Abgeschlossene Aufträge: Bearbeiten + Löschen.
- Neuer eigener Auftragseditor für Kunde, Mitarbeiter, Zahlung, Termin, Produkt/Leistung, Menge, Einheit, Preis und Notiz.
- Abgeschlossene Aufträge können mit „↑ Nach oben“ / „↓ Nach unten“ frei sortiert werden.
- Die manuelle Reihenfolge wird in Supabase gespeichert.
- Bereits abgebuchter Ballenbestand wird beim Löschen eines abgeschlossenen Auftrags nicht automatisch zurückgebucht.
- Supabase wurde vorbereitet, sodass Aufträge/Kunden auch bei vorhandenen Arbeitszeiten gelöscht werden können; die Arbeitszeit bleibt bestehen.
- Neu hinzugekommen: `orderupdate.js`.

## V13.9 – Löschfix
- Aufträge sind jetzt auch dann löschbar, wenn Arbeitszeiten damit verknüpft sind.
- Die Arbeitszeiten bleiben als Historie erhalten; ihre Auftragsverknüpfung wird beim Löschen entfernt.
- Der doppelte untere „Bearbeiten“-Button wurde entfernt.
- Es bleibt nur der Bearbeiten-Button in der oberen Aktionsleiste.
- Supabase-Validierung wurde angepasst, damit SET NULL beim Löschen nicht mehr blockiert.
- Neu hinzugekommen: `orderfix.js`.

## V14 – Live-Karte + Mehrfachfelder
- Live-Tracking-Karte auf `window.L` umgestellt und frisch initialisiert.
- Aktive Positionen und Feldgrenzen werden angezeigt.
- Arbeitszeit: mehrere Felder gleichzeitig auswählbar.
- Alle gewählten Felder werden beim Start mit dem Auftrag verknüpft.
- Auftragsverwaltung: im Bearbeiten-Dialog mehrere Felder auswählbar und speicherbar.
- Neuer Patch: `featurefix14.js`.
\n\n## V14.1\n- Verkauf heißt jetzt Auftrag erstellen.\n- Oben rechts: + Arbeit / Maschine.\n- Neue teamweite Arbeiten/Kategorien können mit Name, Symbol und Einheiten angelegt werden.\n- Sie erscheinen auch in der Arbeitszeit-Auswahl.\n- Neu: worktypes14.js.\n
## V14.2 – Maschinenpark + Anbaugeräte
- Unter Maschinen gibt es jetzt zwei Bereiche: Maschinenpark und Anbaugeräte.
- Anbaugeräte können mit Name, Kategorie, Arbeitsbreite, Betriebsstunden, Kosten, Wartungsdaten, Nutzer und Notizen angelegt/bearbeitet werden.
- Maschinenpark und Anbaugeräte sind getrennt auswählbar.
- Arbeitszeiterfassung: Maschine + optionales Anbaugerät.
- Auftrag erstellen: Maschine + optionales Anbaugerät.
- Auftragseditor: Maschine + Anbaugerät nachträglich bearbeitbar.
- Supabase wurde um `machine_kind`, `width_m`, `implement_id` und Maschinenverknüpfungen für Aufträge erweitert.
- Neu: `implements14.js`.

## V14.3 – Felder bei Auftrag erstellen
- Bei „Auftrag erstellen“ können jetzt mehrere Felder/Schläge gleichzeitig ausgewählt werden.
- Nach Auswahl des Kunden werden dessen Felder als Checkboxen angezeigt.
- Alle ausgewählten Felder werden beim Speichern dauerhaft mit dem Auftrag verknüpft.
- Neu: `orderfields14.js`.

## V14.4 – Feldauswahl Fix
- Felder bei „Auftrag erstellen“ werden jetzt direkt aus Supabase anhand des gewählten Kunden geladen.
- Anzahl verfügbarer Felder wird angezeigt.
- „Alle auswählen“ ergänzt.
- Mehrfachauswahl wird nach Auftragserstellung robust mit dem neu angelegten Auftrag verknüpft.
- Neu: `orderfieldsfix14.js`.

## V14.5 – Speicherfix Auftrag
- Auftragsspeichern wurde auf eine einzige atomische Supabase-Funktion umgestellt.
- Auftrag, Auftragsposition, Maschine, Anbaugerät und alle ausgewählten Felder werden in einem Vorgang gespeichert.
- Bei einem Fehler gibt es keinen halbfertigen Auftrag mehr.
- Ein nachträglicher Ladefehler zeigt nicht mehr fälschlich „Auftrag konnte nicht gespeichert werden“.
- Neu: `ordersave14.js`.

## V14.6 – Arbeitszeiten, 4 Anbaugeräte, Kalender
- Arbeitszeiten können gelöscht werden; Admins können alle, Mitarbeiter ihre eigenen löschen.
- Bis zu 4 Anbaugeräte in der Arbeitszeiterfassung.
- Bis zu 4 Anbaugeräte bei Auftrag erstellen.
- Bis zu 4 Anbaugeräte im Auftragseditor.
- Zwei getrennte Kalender: „Mein Kalender“ und „Team-Kalender“.
- Termine haben Startdatum und Enddatum.
- Termine können bearbeitet und gelöscht werden.
- Private Termine sind nur im persönlichen Kalender des Erstellers sichtbar.
- Team-Termine stehen im unteren Kalender für alle sichtbar.
- Supabase wurde um Kalender-Sichtbarkeit, Enddatum sowie Mehrfach-Anbaugeräte-Verknüpfungen erweitert.
- Neu: `operations14.js`.
