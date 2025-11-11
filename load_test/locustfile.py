from locust import HttpUser, task, between

class StandardUser(HttpUser):
    wait_time = between(1, 5)

    @task
    def load_homepage(self):
        self.client.get("/app/home") # Default test

class AdminUser(HttpUser):
    wait_time = between(1, 5)

    @task
    def load_admin_page(self):
        self.client.get("/dashboard") # Default test