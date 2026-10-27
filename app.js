const API_URL = "https://jsonplaceholder.typicode.com/users";
const STORAGE_KEY = "user-manager-data";

let users = [];
let editingUserId = null;
const localUserIds = new Set();
let savedData = loadSavedData();

function loadSavedData() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      addedUsers: Array.isArray(parsed.addedUsers) ? parsed.addedUsers : [],
      deletedUserIds: Array.isArray(parsed.deletedUserIds)
        ? parsed.deletedUserIds
        : [],
      updatedUsers:
        parsed.updatedUsers && typeof parsed.updatedUsers === "object"
          ? parsed.updatedUsers
          : {},
    };
  } catch (error) {
    console.warn("Could not read saved users:", error);
    return { addedUsers: [], deletedUserIds: [], updatedUsers: {} };
  }
}

function saveUsers() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedData));
  } catch (error) {
    console.error("Could not save users in this browser:", error);
    showStatus("Changes made, but this browser could not save them.", "error");
  }
}


const userForm = document.getElementById("user-form");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const websiteInput = document.getElementById("website");

const tableBody = document.getElementById("users-table-body");
const userCount = document.getElementById("user-count");
const statusMessage = document.getElementById("status-message");

const formTitle = document.getElementById("form-title");
const submitButton = document.getElementById("submit-button");
const cancelButton = document.getElementById("cancel-button");

const table = document.getElementById("users-table");
const tableHeaders = table.getElementsByTagName("th");


for (let i = 0; i < tableHeaders.length; i++) {
  tableHeaders[i].style.backgroundColor = "#1e3a5f";
  tableHeaders[i].style.color = "#ffffff";
}

function showNormalThis() {
  console.log(this);
}

const showArrowThis = () => {
  console.log(this);
};

const thisDemo = {
  showNormalThis,
  showArrowThis,
};

thisDemo.showNormalThis();
thisDemo.showArrowThis();


const xhrRequest = (method, url, data = null) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open(method, url, true);

    if (data !== null) {
      xhr.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
    }

    xhr.onload = () => {
      let responseData = null;

      try {
        responseData = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch (error) {
        console.error("Invalid JSON response:", xhr.responseText);
        reject(
          new Error(
            `Invalid JSON response. HTTP ${xhr.status}. ${error.message}`,
          ),
        );
        return;
      }

      resolve({
        status: xhr.status,
        data: responseData,
      });
    };

    xhr.onerror = () => {
      reject(new Error("Network error. Please check your connection."));
    };

    xhr.ontimeout = () => {
      reject(new Error("The request timed out. Please try again."));
    };

    xhr.timeout = 15000;

    xhr.send(data === null ? null : JSON.stringify(data));
  });
};


const showStatus = (message, type = "") => {
  statusMessage.textContent = message;
  statusMessage.className = "status-message";

  if (type) {
    statusMessage.classList.add(type);
  }
};

const createCell = (value) => {
  const cell = document.createElement("td");

  cell.textContent = value ?? "";

  return cell;
};

const updateUserCount = () => {
  userCount.textContent = `${users.length} ${users.length === 1 ? "user" : "users"}`;
};

const getNextLocalId = () => {
  const highestId = users.reduce((highest, user) => {
    return Math.max(highest, Number(user.id) || 0);
  }, 0);

  return highestId + 1;
};

const resetForm = () => {
  userForm.reset();

  editingUserId = null;

  formTitle.textContent = "Add a User";
  submitButton.textContent = "Add User";
  cancelButton.hidden = true;
};

const renderUsers = () => {
  tableBody.replaceChildren();

  if (users.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 5;
    cell.className = "empty-cell";
    cell.textContent = "No users found.";

    row.appendChild(cell);
    tableBody.appendChild(row);
  }


  users.forEach((user) => {
    const row = document.createElement("tr");

    row.appendChild(createCell(user.id));
    row.appendChild(createCell(user.name));
    row.appendChild(createCell(user.email));
    row.appendChild(createCell(user.website));

    const actionsCell = document.createElement("td");
    const actionButtons = document.createElement("div");

    actionButtons.className = "action-buttons";

    const editButton = document.createElement("button");

    editButton.type = "button";
    editButton.className = "edit-button";
    editButton.textContent = "Edit";

    editButton.addEventListener("click", () => {
      editingUserId = user.id;

      nameInput.value = user.name;
      emailInput.value = user.email;
      websiteInput.value = user.website;

      formTitle.textContent = `Edit User #${user.id}`;
      submitButton.textContent = "Save Changes";
      cancelButton.hidden = false;

      showStatus(`Editing ${user.name}.`);
      userForm.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      nameInput.focus();
    });

    const deleteButton = document.createElement("button");

    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Delete";

    deleteButton.addEventListener("click", () => {
      deleteUser(user.id);
    });

    actionButtons.append(editButton, deleteButton);
    actionsCell.appendChild(actionButtons);
    row.appendChild(actionsCell);

    tableBody.appendChild(row);
  });

  updateUserCount();
};


async function fetchUsers() {
  showStatus("Loading users...");

  try {
    const response = await xhrRequest("GET", API_URL);

    if (response.status !== 200) {
      throw new Error(`Failed to fetch users. HTTP ${response.status}`);
    }

    const deletedIds = new Set(savedData.deletedUserIds.map(Number));
    const updatedUsers = savedData.updatedUsers;
    const serverUsers = response.data
      .filter((user) => !deletedIds.has(Number(user.id)))
      .map((user) => ({ ...user, ...(updatedUsers[user.id] || {}) }));

    users = [...serverUsers, ...savedData.addedUsers];
    localUserIds.clear();
    savedData.addedUsers.forEach((user) => localUserIds.add(Number(user.id)));
    renderUsers();

    showStatus("Users loaded successfully.", "success");
  } catch (error) {
    console.error("Fetch error:", error);
    showStatus(error.message || "Could not load users.", "error");
  }
}


async function createUser(userData) {
  showStatus("Creating user...");

  try {
    const response = await xhrRequest("POST", API_URL, userData);

    if (response.status !== 201) {
      throw new Error(`Failed to create user. HTTP ${response.status}`);
    }

    const newUser = {
      ...response.data,
      ...userData,
      id: getNextLocalId(),
    };

    users.push(newUser);
    localUserIds.add(Number(newUser.id));
    savedData.addedUsers.push(newUser);
    saveUsers();

    renderUsers();
    resetForm();

    showStatus(
      "User created successfully. The change is local to this app.",
      "success",
    );
  } catch (error) {
    console.error("Create error:", error);
    showStatus(error.message || "Could not create user.", "error");
  }
}


async function updateUser(id, userData) {
  showStatus("Updating user...");

  try {
    if (!localUserIds.has(Number(id))) {
      const response = await xhrRequest("PUT", `${API_URL}/${id}`, userData);

      if (response.status !== 200) {
        throw new Error(`Failed to update user. HTTP ${response.status}`);
      }
    }

    users = users.map((user) => {
      if (Number(user.id) === Number(id)) {
        return {
          ...user,
          ...userData,
          id: user.id,
        };
      }

      return user;
    });

    if (localUserIds.has(Number(id))) {
      savedData.addedUsers = savedData.addedUsers.map((user) =>
        Number(user.id) === Number(id) ? { ...user, ...userData } : user,
      );
    } else {
      savedData.updatedUsers[id] = {
        ...(savedData.updatedUsers[id] || {}),
        ...userData,
      };
    }
    saveUsers();

    renderUsers();
    resetForm();

    showStatus(
      "User updated successfully. The change is local to this app.",
      "success",
    );
  } catch (error) {
    console.error("Update error:", error);
    showStatus(error.message || "Could not update user.", "error");
  }
}


async function deleteUser(id) {
  const selectedUser = users.find((user) => Number(user.id) === Number(id));

  if (!selectedUser) {
    showStatus("User not found.", "error");
    return;
  }

  const confirmed = window.confirm(
    `Are you sure you want to delete ${selectedUser.name}?`,
  );

  if (!confirmed) {
    return;
  }

  showStatus("Deleting user...");

  try {
    if (!localUserIds.has(Number(id))) {
      const response = await xhrRequest("DELETE", `${API_URL}/${id}`);

      if (response.status !== 200) {
        throw new Error(`Failed to delete user. HTTP ${response.status}`);
      }
    }

    users = users.filter((user) => Number(user.id) !== Number(id));
    if (localUserIds.has(Number(id))) {
      savedData.addedUsers = savedData.addedUsers.filter(
        (user) => Number(user.id) !== Number(id),
      );
      localUserIds.delete(Number(id));
    } else {
      savedData.deletedUserIds = [
        ...new Set([...savedData.deletedUserIds.map(Number), Number(id)]),
      ];
      delete savedData.updatedUsers[id];
    }
    saveUsers();

    if (Number(editingUserId) === Number(id)) {
      resetForm();
    }

    renderUsers();

    showStatus(
      "User deleted successfully. The change is local to this app.",
      "success",
    );
  } catch (error) {
    console.error("Delete error:", error);
    showStatus(error.message || "Could not delete user.", "error");
  }
}


userForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  // Collect the form values.
  const userData = {
    name: nameInput.value.trim(),
    email: emailInput.value.trim(),
    website: websiteInput.value.trim(),
  };

  // Basic validation.
  if (!userData.name || !userData.email || !userData.website) {
    showStatus("Please fill in all fields.", "error");
    return;
  }

  // Decide whether the form creates or updates a user.
  if (editingUserId !== null) {
    await updateUser(editingUserId, userData);
  } else {
    await createUser(userData);
  }
});

cancelButton.addEventListener("click", () => {
  resetForm();
  showStatus("Edit cancelled.");
});

fetchUsers();
