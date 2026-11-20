const departmentByCategory = {
    Road: "Public Works Department",
    Garbage: "Sanitation Department",
    Water: "Water Department",
    Streetlight: "Electrical Department",
    Other: "General Department"
};

const getDepartmentForCategory = (category) => {
    return departmentByCategory[category] || null;
};

module.exports = { departmentByCategory, getDepartmentForCategory };
