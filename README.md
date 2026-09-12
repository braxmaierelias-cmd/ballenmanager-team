# FarmManager V11 – Arbeitszeit + Live-Karte

Neu:
- Eigene Arbeitszeiterfassung pro Mitarbeiter
- Start / Pause / Fortsetzen / Stop & Speichern
- Kunde + konkreter Auftrag
- Maschine + Arbeitsart
- Arbeitszeit wird dem Auftrag zugeordnet
- Nur der angemeldete Mitarbeiter kann seinen eigenen Timer bedienen
- Admin kann Zeitübersichten sehen, fremde Timer aber nicht starten/stoppen
- Live-GPS-Karte für aktive Maschinen
- Tracking startet beim Beginn einer Arbeitszeit
- Geschwindigkeit, Fahrer, Maschine und Arbeitsart auf der Karte
- Standortdaten werden nach Beenden des Einsatzes deaktiviert

Datenbank:
Die benötigten Supabase-Tabellen und Sicherheitsregeln wurden bereits eingerichtet.

Wichtig:
- app.js bleibt unverändert.
- Für GPS muss der Mitarbeiter dem Browser Standortzugriff erlauben.
- In einer Web-App ist dauerhaftes Hintergrundtracking auf iPhone/Android eingeschränkt.
