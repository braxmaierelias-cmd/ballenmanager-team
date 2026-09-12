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
