package com.timesvalorant.cadastro_times.controller;


import com.timesvalorant.cadastro_times.business.TimeService;
import com.timesvalorant.cadastro_times.infrastructure.entitys.Time;
import jakarta.persistence.SqlResultSetMapping;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/time")
@RequiredArgsConstructor

public class TimeController {

    private final TimeService timeService;

    @PostMapping
    public ResponseEntity<Void> salvarTime(@RequestBody Time time){
        timeService.salvarTime(time);
        return ResponseEntity.ok().build();
    }

    @GetMapping
    public ResponseEntity<Time>buscarTimePorNome(@RequestParam String nome){
        return ResponseEntity.ok(timeService.buscarTimeporNome(nome));
    }

    @DeleteMapping
    public ResponseEntity<Void>deletarTimePorNome(@RequestParam String nome){
        timeService.deletarTimeporNome(nome);
        return ResponseEntity.ok().build();
    }

    @PutMapping
    public ResponseEntity<Void>atualizarTimeporId(@RequestBody Time time, @RequestParam Integer id){
        timeService.atualizarTimePorId(id, time);
        return ResponseEntity.ok().build();
    }
}
