
# Integration Testing Summary – VisionPlay Hub
In response to client feedback about the absence of automated tests, a separate set of **10 Django-based integration tests** was implemented. These covered:
- Google OAuth and manual login  
- Session handling and password encryption  
- Game table integrity and leaderboard-safe interactions  

All 10 tests passed successfully, confirming backend logic operates correctly in isolated conditions.

### Technical Challenges : these changes were **not committed** to the main branch to preserve production stability.

## Current Testing Architecture
A dedicated `testing/` directory was created, containing:
- `__init__.py`  
- `test_integration.py`  


## Backend Code Adjustments
These tests can be executed independently using the following steps: 

### 1. `views.py` – Leaderboard View Update
Added authentication check using `if` condition to ensure only logged-in users can view the leaderboard:
```python
from django.http import JsonResponse
from django.shortcuts import render
from .models import Games, Leaderboards

def leaderboard(request):
    if not request.user.is_authenticated:
        return JsonResponse({'detail': 'Authentication credentials were not provided.'}, status=401)
    
    games = Games.objects.all()
    leaderboard_data = []
    for game in games:
        entries = Leaderboards.objects.filter(game=game).order_by('ranking')
        leaderboard_data.append({'game': game, 'entries': entries})

    return render(request, 'cv_games_app/leaderboard.html', {'leaderboard_data': leaderboard_data})
```

---

### 2. `models.py` – Set `managed = True`
Ensure Django manages database tables by adding the following inside your model's `Meta` class:
```python
class Meta:
    managed = True
```

---

### 3. `migrations/0003_initial.py` – Reflect `managed = True`
Ensure the migration reflects the model change:
```python
options={
    'managed': True,
    ...
},
```

---

### 4. Testing Setup
Create a test structure with an `__init__.py` and at least one test file.
#### Command:
```bash
New-Item -Path .\testing\__init__.py -ItemType File
```
#### Add Test file: `testing/test_integration.py`

---

### 5. Run Migrations
```bash
python backend/manage.py migrate
```
---

### 6. Run Tests
```bash
python backend/manage.py test testing --settings=cv_games.settings --verbosity=2
```
