function switchChart(chartType) {
        document.getElementById('bloodPressure').style.display = 'none';
        document.getElementById('cholesterol').style.display = 'none';
        document.getElementById('glucose').style.display = 'none';
        document.getElementById(chartType).style.display = 'block';
    }