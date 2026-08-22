<?php

namespace App\Controller\Auth;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Endpoint de login — intercepté par le firewall Symfony (json_login).
 * Le __invoke() n'est jamais atteint en pratique.
 * Le body attendu : { "username": "email@example.com", "password": "..." }
 */
#[Route('/api/auth/login', name: 'api_auth_login', methods: ['POST'])]
class LoginController extends AbstractController
{
    public function __invoke(): JsonResponse
    {
        // Ce code n'est jamais exécuté.
        // Le firewall json_login intercepte la requête avant d'arriver ici
        // et retourne directement le token JWT.
        return $this->json(['error' => 'Non intercepté par le firewall.'], 500);
    }
}
