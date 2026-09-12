# FarmManager V12 – Design 2 + Felder/Schläge

Neue Menü-Reihenfolge:
1. Dashboard
2. Arbeitszeit
3. Live Karte
4. Verkauf
5. Aufträge
6. Kunden
7. Kalender
8. Maschinen
9. Bestand
10. Team

Neu:
- Helles Design Nr. 2
- Felder/Schläge per Karte als Polygon anlegen
- Feld direkt einem Kunden zuordnen
- Fläche in ha automatisch aus Polygon berechnen (kann manuell angepasst werden)
- Kultur/Nutzung und Notiz speichern
- Mehrere Felder bei Auftragserstellung auswählen
- Felder werden am Auftrag gespeichert
- Während eines laufenden Einsatzes Feld wechseln bzw. weiteres Kundenfeld auswählen
- Arbeitszeit wird in Zeitabschnitten je Feld gespeichert
- Pausen werden nicht als Feldzeit mitgerechnet
- Feldzeiten werden am Auftrag angezeigt
- Live-Karte zeigt zusätzlich gespeicherte Feldgrenzen
- Bestehende Arbeitszeit- und GPS-Funktionen bleiben erhalten

Wichtig:
- app.js bleibt unverändert.
- Benötigte Supabase-Tabellen und Sicherheitsregeln wurden bereits eingerichtet.
