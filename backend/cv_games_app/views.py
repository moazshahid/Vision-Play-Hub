from django.shortcuts import render

# Added: Index view to render index.html
def index(request):
    return render(request, 'index.html')
